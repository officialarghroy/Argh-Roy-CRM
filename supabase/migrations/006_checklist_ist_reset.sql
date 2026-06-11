-- Daily checklist day boundary: 3:00 AM Asia/Kolkata

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

create or replace function public.generate_daily_checklist(p_date date default null)
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
    where user_id = auth.uid() and active = true
  loop
    if not exists (
      select 1 from public.daily_checklist_items
      where user_id = auth.uid()
        and template_id = tpl.id
        and date = target_date
        and deleted_at is null
    ) then
      insert into public.daily_checklist_items (
        user_id, title, date, template_id, scheduled_at, position
      ) values (
        auth.uid(),
        tpl.title,
        target_date,
        tpl.id,
        case when tpl.scheduled_time is not null
          then (target_date + tpl.scheduled_time) at time zone 'Asia/Kolkata'
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
