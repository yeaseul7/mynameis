alter table public.daily_todos
  drop constraint if exists daily_todos_one_per_day;

create or replace function public.enforce_daily_todo_limit()
returns trigger
language plpgsql
as $$
begin
  if (select count(*) from public.daily_todos where user_id = new.user_id and todo_date = new.todo_date) >= 5 then
    raise exception '하루 TODO는 최대 5개까지 만들 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_todos_limit_five on public.daily_todos;
create trigger daily_todos_limit_five
before insert on public.daily_todos
for each row execute function public.enforce_daily_todo_limit();

comment on table public.daily_todos is '사용자별 하루 최대 다섯 개의 TODO';
