-- Per-user feature flags (calendar access, Google sync, full app access for collaborators)

alter table public.profiles
  add column if not exists calendar_access boolean not null default true,
  add column if not exists google_sync_enabled boolean not null default true,
  add column if not exists full_access boolean not null default false,
  add column if not exists data_owner_id uuid references auth.users(id) on delete set null;
