-- CRM-only cleanup (does NOT delete from Google).
-- For full reset including Google Calendar & Tasks, use Settings → Reset calendar & overdue
-- after deploying the google-reset edge function.

-- Soft-delete Google-linked, scheduled, and overdue tasks
update public.tasks
set deleted_at = now()
where user_id = auth.uid()
  and deleted_at is null
  and (
    google_task_id is not null
    or google_event_id is not null
    or scheduled_at is not null
    or (status <> 'done' and due_date < current_date)
  );

-- Soft-delete overdue checklist
update public.daily_checklist_items
set deleted_at = now()
where user_id = auth.uid()
  and deleted_at is null
  and completed = false
  and date < current_date;

-- Clear calendar fields on remaining items
update public.tasks
set
  scheduled_at = null,
  google_event_id = null,
  google_calendar_id = null,
  google_task_id = null,
  google_task_list_id = null
where user_id = auth.uid()
  and deleted_at is null;

update public.daily_checklist_items
set scheduled_at = null, google_event_id = null
where user_id = auth.uid()
  and deleted_at is null;

delete from public.calendar_sync_map where user_id = auth.uid();
delete from public.google_tasks_sync_map where user_id = auth.uid();
