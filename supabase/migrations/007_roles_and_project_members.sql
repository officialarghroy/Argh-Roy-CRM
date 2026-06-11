-- Roles, project membership, and collaborator-aware RLS

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists role text not null default 'collaborator'
  check (role in ('admin', 'collaborator'));

-- Existing accounts are admins
update public.profiles set role = 'admin' where role = 'collaborator' or role is null;

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  unique (project_id, user_id)
);

create index if not exists idx_project_members_user_id on public.project_members(user_id);
create index if not exists idx_project_members_project_id on public.project_members(project_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.project_owner_id(p_project_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select user_id from public.projects where id = p_project_id;
$$;

-- New signups default to collaborator unless metadata specifies role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'collaborator');
  if v_role not in ('admin', 'collaborator') then
    v_role := 'collaborator';
  end if;

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    v_role
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: project_members
-- ---------------------------------------------------------------------------

alter table public.project_members enable row level security;

create policy "Admins manage project members"
  on public.project_members for all
  using (
    public.is_admin()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

create policy "Collaborators view own memberships"
  on public.project_members for select
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RLS: profiles (extend)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins view collaborator profiles"
  on public.profiles for select
  using (public.is_admin() and role = 'collaborator');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- RLS: projects
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view own projects" on public.projects;
drop policy if exists "Users can insert own projects" on public.projects;
drop policy if exists "Users can update own projects" on public.projects;
drop policy if exists "Users can delete own projects" on public.projects;

create policy "Admins manage own projects"
  on public.projects for all
  using (public.is_admin() and auth.uid() = user_id)
  with check (public.is_admin() and auth.uid() = user_id);

create policy "Collaborators view assigned projects"
  on public.projects for select
  using (not public.is_admin() and public.is_project_member(id));

-- ---------------------------------------------------------------------------
-- RLS: tasks
-- ---------------------------------------------------------------------------

drop policy if exists "Users can manage own tasks" on public.tasks;

create policy "Admins manage own tasks"
  on public.tasks for all
  using (public.is_admin() and auth.uid() = user_id)
  with check (public.is_admin() and auth.uid() = user_id);

create policy "Collaborators access assigned project tasks"
  on public.tasks for all
  using (
    not public.is_admin()
    and project_id is not null
    and public.is_project_member(project_id)
  )
  with check (
    not public.is_admin()
    and project_id is not null
    and public.is_project_member(project_id)
    and user_id = public.project_owner_id(project_id)
  );

-- ---------------------------------------------------------------------------
-- RLS: task_sections
-- ---------------------------------------------------------------------------

drop policy if exists "Users can manage own sections" on public.task_sections;

create policy "Admins manage own sections"
  on public.task_sections for all
  using (public.is_admin() and auth.uid() = user_id)
  with check (public.is_admin() and auth.uid() = user_id);

create policy "Collaborators access assigned project sections"
  on public.task_sections for all
  using (
    not public.is_admin()
    and project_id is not null
    and public.is_project_member(project_id)
  )
  with check (
    not public.is_admin()
    and project_id is not null
    and public.is_project_member(project_id)
    and user_id = public.project_owner_id(project_id)
  );

-- ---------------------------------------------------------------------------
-- RLS: daily checklist + templates (own rows only)
-- ---------------------------------------------------------------------------

drop policy if exists "Users can manage own checklist" on public.daily_checklist_items;
drop policy if exists "Users manage own checklist templates" on public.checklist_templates;

create policy "Users manage own checklist"
  on public.daily_checklist_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own checklist templates"
  on public.checklist_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RLS: sops
-- ---------------------------------------------------------------------------

drop policy if exists "Users can manage own sops" on public.sops;

create policy "Admins manage own sops"
  on public.sops for all
  using (public.is_admin() and auth.uid() = user_id)
  with check (public.is_admin() and auth.uid() = user_id);

create policy "Collaborators view assigned project sops"
  on public.sops for select
  using (
    not public.is_admin()
    and project_id is not null
    and public.is_project_member(project_id)
    and deleted_at is null
  );

-- ---------------------------------------------------------------------------
-- RLS: activity_log
-- ---------------------------------------------------------------------------

drop policy if exists "Users view own activity log" on public.activity_log;
drop policy if exists "Users insert own activity log" on public.activity_log;

create policy "Users view relevant activity log"
  on public.activity_log for select
  using (
    auth.uid() = user_id
    or (
      not public.is_admin()
      and entity_type = 'task'
      and exists (
        select 1 from public.tasks t
        where t.id = entity_id
          and t.project_id is not null
          and public.is_project_member(t.project_id)
      )
    )
    or (
      not public.is_admin()
      and entity_type = 'project'
      and public.is_project_member(entity_id)
    )
  );

create policy "Users insert own activity log"
  on public.activity_log for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RLS: task_completions
-- ---------------------------------------------------------------------------

drop policy if exists "Users manage own task completions" on public.task_completions;

create policy "Admins manage own task completions"
  on public.task_completions for all
  using (public.is_admin() and auth.uid() = user_id)
  with check (public.is_admin() and auth.uid() = user_id);

create policy "Collaborators manage completions on assigned tasks"
  on public.task_completions for all
  using (
    not public.is_admin()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.project_id is not null
        and public.is_project_member(t.project_id)
    )
  )
  with check (
    not public.is_admin()
    and auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.project_id is not null
        and public.is_project_member(t.project_id)
    )
  );

-- Integrations and sync maps stay personal (admin-only in practice)
-- Policies unchanged: auth.uid() = user_id

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.project_owner_id(uuid) to authenticated;
