-- Secondary admins (data_owner_id set) operate on the primary owner's CRM data

create or replace function public.effective_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select data_owner_id from public.profiles where id = auth.uid()),
    auth.uid()
  );
$$;

grant execute on function public.effective_owner_id() to authenticated;

-- projects
drop policy if exists "Admins manage own projects" on public.projects;

create policy "Admins manage own projects"
  on public.projects for all
  using (public.is_admin() and user_id = public.effective_owner_id())
  with check (public.is_admin() and user_id = public.effective_owner_id());

-- tasks
drop policy if exists "Admins manage own tasks" on public.tasks;

create policy "Admins manage own tasks"
  on public.tasks for all
  using (public.is_admin() and user_id = public.effective_owner_id())
  with check (public.is_admin() and user_id = public.effective_owner_id());

-- task_sections
drop policy if exists "Admins manage own sections" on public.task_sections;

create policy "Admins manage own sections"
  on public.task_sections for all
  using (public.is_admin() and user_id = public.effective_owner_id())
  with check (public.is_admin() and user_id = public.effective_owner_id());

-- sops
drop policy if exists "Admins manage own sops" on public.sops;

create policy "Admins manage own sops"
  on public.sops for all
  using (public.is_admin() and user_id = public.effective_owner_id())
  with check (public.is_admin() and user_id = public.effective_owner_id());

-- task_completions
drop policy if exists "Admins manage own task completions" on public.task_completions;

create policy "Admins manage own task completions"
  on public.task_completions for all
  using (public.is_admin() and user_id = public.effective_owner_id())
  with check (public.is_admin() and user_id = public.effective_owner_id());

-- project_members management: primary owner or effective owner projects
drop policy if exists "Admins manage project members" on public.project_members;

create policy "Admins manage project members"
  on public.project_members for all
  using (
    public.is_admin()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = public.effective_owner_id()
    )
  )
  with check (
    public.is_admin()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.user_id = public.effective_owner_id()
    )
  );
