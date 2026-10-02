-- Permanently remove a user's CRM tasks and task-specific history.
-- Google Tasks are intentionally not deleted; the client pauses sync so they
-- cannot repopulate the CRM automatically after a fresh start.

create or replace function public.reset_my_tasks()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  tasks_removed integer := 0;
  completions_removed integer := 0;
  history_removed integer := 0;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to reset tasks';
  end if;

  delete from public.google_tasks_sync_map
  where user_id = current_user_id;

  delete from public.calendar_sync_map
  where user_id = current_user_id
    and entity_type = 'task';

  delete from public.activity_log
  where user_id = current_user_id
    and entity_type = 'task';
  get diagnostics history_removed = row_count;

  delete from public.task_completions
  where user_id = current_user_id;
  get diagnostics completions_removed = row_count;

  delete from public.tasks
  where user_id = current_user_id;
  get diagnostics tasks_removed = row_count;

  return jsonb_build_object(
    'tasks_removed', tasks_removed,
    'completions_removed', completions_removed,
    'history_removed', history_removed
  );
end;
$$;

grant execute on function public.reset_my_tasks() to authenticated;
