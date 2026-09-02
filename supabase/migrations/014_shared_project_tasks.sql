-- Shared projects: all members can see and manage every task/section on that project.
-- Personal tasks (project_id is null) stay private to each user.

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------

drop policy if exists "Users manage own tasks" on public.tasks;

create policy "Users select own or shared project tasks"
  on public.tasks for select
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.can_access_project(project_id)
    )
  );

create policy "Users insert own tasks"
  on public.tasks for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or public.can_access_project(project_id)
    )
  );

create policy "Users update own or shared project tasks"
  on public.tasks for update
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.can_access_project(project_id)
    )
  )
  with check (
    (
      auth.uid() = user_id
      or (
        project_id is not null
        and public.can_access_project(project_id)
      )
    )
    and (
      project_id is null
      or public.can_access_project(project_id)
    )
  );

create policy "Users delete own or shared project tasks"
  on public.tasks for delete
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.can_access_project(project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- task_sections
-- ---------------------------------------------------------------------------

drop policy if exists "Users manage own sections" on public.task_sections;

create policy "Users select own or shared project sections"
  on public.task_sections for select
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.can_access_project(project_id)
    )
  );

create policy "Users insert own sections"
  on public.task_sections for insert
  with check (
    auth.uid() = user_id
    and (
      project_id is null
      or public.can_access_project(project_id)
    )
  );

create policy "Users update own or shared project sections"
  on public.task_sections for update
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.can_access_project(project_id)
    )
  )
  with check (
    (
      auth.uid() = user_id
      or (
        project_id is not null
        and public.can_access_project(project_id)
      )
    )
    and (
      project_id is null
      or public.can_access_project(project_id)
    )
  );

create policy "Users delete own or shared project sections"
  on public.task_sections for delete
  using (
    auth.uid() = user_id
    or (
      project_id is not null
      and public.can_access_project(project_id)
    )
  );

-- ---------------------------------------------------------------------------
-- task_completions: allow completing shared project tasks
-- ---------------------------------------------------------------------------

drop policy if exists "Users manage own task completions" on public.task_completions;

create policy "Users manage own task completions"
  on public.task_completions for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          t.user_id = auth.uid()
          or (
            t.project_id is not null
            and public.can_access_project(t.project_id)
          )
        )
    )
  );
