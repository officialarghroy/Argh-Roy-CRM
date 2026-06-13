-- Required by generate_daily_checklist (migration 011). Safe to re-run.

create or replace function public.get_checklist_date(p_at timestamptz default now())
returns date
language sql
stable
as $$
  select case
    when extract(hour from p_at at time zone 'Asia/Kolkata') < 3
      then ((p_at at time zone 'Asia/Kolkata')::date - 1)
    else (p_at at time zone 'Asia/Kolkata')::date
  end;
$$;

grant execute on function public.get_checklist_date(timestamptz) to authenticated;

-- Remove old single-argument overload so PostgREST always uses the mode-aware version
drop function if exists public.generate_daily_checklist(date);

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

grant execute on function public.generate_daily_checklist(date, text) to authenticated;
