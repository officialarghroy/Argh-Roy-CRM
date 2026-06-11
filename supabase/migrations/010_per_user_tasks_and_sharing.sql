-- Per-user tasks & history; projects shared only via project_members

-- Clear legacy shared-workspace links
update public.profiles set data_owner_id = null where data_owner_id is not null;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_access_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (
        p.user_id = auth.uid()
        or public.is_project_member(p.id)
      )
  );
$$;

grant execute on function public.can_access_project(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- profiles: allow picking users to share projects with
-- ---------------------------------------------------------------------------

drop policy if exists "Admins view collaborator profiles" on public.profiles;

create policy "Users view profiles for project sharing"
  on public.profiles for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- projects: own + shared (read-only for members)
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage own projects" on public.projects;
drop policy if exists "Collaborators view assigned projects" on public.projects;

create policy "Users manage own projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users view shared projects"
  on public.projects for select
  using (public.is_project_member(id));

-- ---------------------------------------------------------------------------
-- project_members: project owners manage sharing
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage project members" on public.project_members;

create policy "Project owners manage members"
  on public.project_members for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- tasks: each user owns their rows; project link requires access
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage own tasks" on public.tasks;
drop policy if exists "Collaborators access assigned project tasks" on public.tasks;

create policy "Users manage own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or public.can_access_project(project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- task_sections
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage own sections" on public.task_sections;
drop policy if exists "Collaborators access assigned project sections" on public.task_sections;

create policy "Users manage own sections"
  on public.task_sections for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or public.can_access_project(project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- sops
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage own sops" on public.sops;
drop policy if exists "Collaborators view assigned project sops" on public.sops;

create policy "Users manage own sops"
  on public.sops for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users view sops on shared projects"
  on public.sops for select
  using (
    project_id is not null
    and public.is_project_member(project_id)
    and deleted_at is null
  );

-- ---------------------------------------------------------------------------
-- activity_log: own history only
-- ---------------------------------------------------------------------------

drop policy if exists "Users view relevant activity log" on public.activity_log;

create policy "Users view own activity log"
  on public.activity_log for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- task_completions: own only
-- ---------------------------------------------------------------------------

drop policy if exists "Admins manage own task completions" on public.task_completions;
drop policy if exists "Collaborators manage completions on assigned tasks" on public.task_completions;

create policy "Users manage own task completions"
  on public.task_completions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
