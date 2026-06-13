-- Track Google-side timestamps for last-write-wins task sync

alter table public.google_tasks_sync_map
  add column if not exists google_updated_at timestamptz,
  add column if not exists last_pushed_at timestamptz;
