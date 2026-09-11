create table public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  todo_date date not null,
  title varchar(100) not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_todos_one_per_day unique (user_id, todo_date),
  constraint daily_todos_title_length check (char_length(trim(title)) between 1 and 100)
);

create index daily_todos_user_month_idx on public.daily_todos (user_id, todo_date desc);

create trigger daily_todos_set_updated_at before update on public.daily_todos
for each row execute function public.set_updated_at();

alter table public.daily_todos enable row level security;

create policy "users read their own todos" on public.daily_todos
for select to authenticated using (user_id = (select auth.uid()));
create policy "users create their own todos" on public.daily_todos
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update their own todos" on public.daily_todos
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "users delete their own todos" on public.daily_todos
for delete to authenticated using (user_id = (select auth.uid()));

comment on table public.daily_todos is '사용자별 하루 최대 한 개의 TODO';
