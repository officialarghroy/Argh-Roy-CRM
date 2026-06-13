-- Alpha Mode checklist for the Accountability page

alter table public.checklist_templates
  add column if not exists mode text not null default 'daily';

alter table public.daily_checklist_items
  add column if not exists mode text not null default 'daily';

alter table public.checklist_templates
  drop constraint if exists checklist_templates_mode_check;

alter table public.checklist_templates
  add constraint checklist_templates_mode_check check (mode in ('daily', 'alpha'));

alter table public.daily_checklist_items
  drop constraint if exists daily_checklist_items_mode_check;

alter table public.daily_checklist_items
  add constraint daily_checklist_items_mode_check check (mode in ('daily', 'alpha'));

create index if not exists idx_daily_checklist_user_date_mode
  on public.daily_checklist_items(user_id, date, mode);

create index if not exists idx_checklist_templates_user_mode
  on public.checklist_templates(user_id, mode);

create or replace function public.generate_daily_checklist(
  p_date date default null,
  p_mode text default 'daily'
)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  tpl record;
  target_date date := coalesce(p_date, public.get_checklist_date());
  created_count int := 0;
begin
  for tpl in
    select * from public.checklist_templates
    where user_id = auth.uid() and active = true and mode = p_mode
  loop
    if not exists (
      select 1 from public.daily_checklist_items
      where user_id = auth.uid()
        and template_id = tpl.id
        and date = target_date
        and mode = p_mode
        and deleted_at is null
    ) then
      insert into public.daily_checklist_items (
        user_id, title, date, template_id, scheduled_at, position, mode
      ) values (
        auth.uid(),
        tpl.title,
        target_date,
        tpl.id,
        case when tpl.scheduled_time is not null
          then (target_date + tpl.scheduled_time) at time zone 'Asia/Kolkata'
          else null
        end,
        tpl.position,
        p_mode
      );
      created_count := created_count + 1;
    end if;
  end loop;
  return created_count;
end;
$$;
