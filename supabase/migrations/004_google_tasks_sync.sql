-- Google Tasks sync support (works alongside Calendar sync)

alter table public.user_integrations add column if not exists google_task_list_id text;
alter table public.user_integrations add column if not exists tasks_sync_enabled boolean not null default true;

alter table public.tasks add column if not exists google_task_id text;
alter table public.tasks add column if not exists google_task_list_id text;

create table if not exists public.google_tasks_sync_map (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid not null references public.tasks(id) on delete cascade,
  google_task_id text not null,
  google_task_list_id text not null,
  last_synced_at timestamptz default now(),
  unique(user_id, entity_id),
  unique(user_id, google_task_id, google_task_list_id)
);

create index if not exists idx_tasks_google_task_id on public.tasks(google_task_id);
create index if not exists idx_google_tasks_sync_user on public.google_tasks_sync_map(user_id);

alter table public.google_tasks_sync_map enable row level security;
create policy "Users manage own google tasks sync map" on public.google_tasks_sync_map for all using (auth.uid() = user_id);

-- Allow provider label google for unified integration (optional alias)
comment on column public.user_integrations.google_task_list_id is 'Default Google Tasks list ID, e.g. from @default or users primary list';
