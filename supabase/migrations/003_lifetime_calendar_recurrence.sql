-- Phase 2+3: Lifetime history, recurrence, calendar, Google sync

-- Soft delete & archive columns
alter table public.tasks add column if not exists deleted_at timestamptz;
alter table public.tasks add column if not exists archived_at timestamptz;
alter table public.tasks add column if not exists scheduled_at timestamptz;
alter table public.tasks add column if not exists duration_minutes int default 30;
alter table public.tasks add column if not exists recurrence_rule text;
alter table public.tasks add column if not exists recurrence_parent_id uuid references public.tasks(id) on delete set null;
alter table public.tasks add column if not exists is_recurring_template boolean not null default false;
alter table public.tasks add column if not exists google_event_id text;
alter table public.tasks add column if not exists google_calendar_id text;

alter table public.projects add column if not exists deleted_at timestamptz;
alter table public.projects add column if not exists archived_at timestamptz;

alter table public.daily_checklist_items add column if not exists deleted_at timestamptz;
alter table public.daily_checklist_items add column if not exists template_id uuid;
alter table public.daily_checklist_items add column if not exists scheduled_at timestamptz;
alter table public.daily_checklist_items add column if not exists completed_at timestamptz;
alter table public.daily_checklist_items add column if not exists google_event_id text;

alter table public.sops add column if not exists deleted_at timestamptz;
alter table public.sops add column if not exists archived_at timestamptz;

-- Checklist templates (recurring daily habits)
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  recurrence_rule text not null default 'FREQ=DAILY',
  scheduled_time time,
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.daily_checklist_items
  add constraint daily_checklist_items_template_id_fkey
  foreign key (template_id) references public.checklist_templates(id) on delete set null;

-- Activity log (lifetime audit trail)
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'checklist', 'project', 'sop', 'checklist_template')),
  entity_id uuid not null,
  action text not null check (action in ('created', 'updated', 'completed', 'uncompleted', 'archived', 'restored', 'deleted', 'scheduled', 'synced')),
  snapshot jsonb,
  created_at timestamptz default now()
);

-- Task completion history
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  notes text,
  duration_minutes int,
  created_at timestamptz default now()
);

-- Google Calendar integration
create table if not exists public.user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'google_calendar',
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  calendar_id text default 'primary',
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

-- Maps CRM entities to Google events
create table if not exists public.calendar_sync_map (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('task', 'checklist')),
  entity_id uuid not null,
  google_event_id text not null,
  google_calendar_id text not null default 'primary',
  last_synced_at timestamptz default now(),
  sync_direction text default 'bidirectional',
  unique(user_id, entity_type, entity_id)
);

-- Indexes
create index if not exists idx_tasks_deleted_at on public.tasks(deleted_at);
create index if not exists idx_tasks_scheduled_at on public.tasks(scheduled_at);
create index if not exists idx_tasks_recurrence_parent on public.tasks(recurrence_parent_id);
create index if not exists idx_activity_log_user_created on public.activity_log(user_id, created_at desc);
create index if not exists idx_activity_log_entity on public.activity_log(entity_type, entity_id);
create index if not exists idx_task_completions_task on public.task_completions(task_id);
create index if not exists idx_checklist_templates_user on public.checklist_templates(user_id);
create index if not exists idx_daily_checklist_template on public.daily_checklist_items(template_id);

-- Full-text search on tasks
alter table public.tasks add column if not exists search_vector tsvector
  generated always as (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored;
create index if not exists idx_tasks_search on public.tasks using gin(search_vector);

-- RLS for new tables
alter table public.checklist_templates enable row level security;
alter table public.activity_log enable row level security;
alter table public.task_completions enable row level security;
alter table public.user_integrations enable row level security;
alter table public.calendar_sync_map enable row level security;

create policy "Users manage own checklist templates" on public.checklist_templates for all using (auth.uid() = user_id);
create policy "Users view own activity log" on public.activity_log for select using (auth.uid() = user_id);
create policy "Users insert own activity log" on public.activity_log for insert with check (auth.uid() = user_id);
create policy "Users manage own task completions" on public.task_completions for all using (auth.uid() = user_id);
create policy "Users manage own integrations" on public.user_integrations for all using (auth.uid() = user_id);
create policy "Users manage own sync map" on public.calendar_sync_map for all using (auth.uid() = user_id);

-- Triggers
create trigger checklist_templates_updated_at before update on public.checklist_templates
  for each row execute function public.set_updated_at();
create trigger user_integrations_updated_at before update on public.user_integrations
  for each row execute function public.set_updated_at();

-- Function: log activity (callable from client)
create or replace function public.log_activity(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_snapshot jsonb default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.activity_log (user_id, entity_type, entity_id, action, snapshot)
  values (auth.uid(), p_entity_type, p_entity_id, p_action, p_snapshot);
end;
$$;

-- Function: generate daily checklist from templates
create or replace function public.generate_daily_checklist(p_date date default current_date)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  tpl record;
  created_count int := 0;
begin
  for tpl in
    select * from public.checklist_templates
    where user_id = auth.uid() and active = true
  loop
    if not exists (
      select 1 from public.daily_checklist_items
      where user_id = auth.uid()
        and template_id = tpl.id
        and date = p_date
        and deleted_at is null
    ) then
      insert into public.daily_checklist_items (
        user_id, title, date, template_id, scheduled_at, position
      ) values (
        auth.uid(),
        tpl.title,
        p_date,
        tpl.id,
        case when tpl.scheduled_time is not null
          then (p_date + tpl.scheduled_time) at time zone coalesce(
            (select timezone from public.profiles where id = auth.uid()),
            'UTC'
          )
          else null
        end,
        tpl.position
      );
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;
