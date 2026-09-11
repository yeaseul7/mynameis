create extension if not exists "pgcrypto";

create table if not exists public.daily_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  todo_date date not null,
  title varchar(100) not null check (char_length(trim(title)) between 1 and 100),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_todos_user_month_idx
on public.daily_todos (user_id, todo_date desc);

alter table public.daily_todos drop constraint if exists daily_todos_one_per_day;

create or replace function public.enforce_daily_todo_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.daily_todos where user_id = new.user_id and todo_date = new.todo_date) >= 5 then
    raise exception '하루 TODO는 최대 5개까지 만들 수 있습니다.';
  end if;
  return new;
end;
$$;

drop trigger if exists daily_todos_limit_five on public.daily_todos;
create trigger daily_todos_limit_five before insert on public.daily_todos
for each row execute function public.enforce_daily_todo_limit();

alter table public.daily_todos enable row level security;
drop policy if exists "users read their own todos" on public.daily_todos;
drop policy if exists "users create their own todos" on public.daily_todos;
drop policy if exists "users update their own todos" on public.daily_todos;
drop policy if exists "users delete their own todos" on public.daily_todos;
create policy "users read their own todos" on public.daily_todos for select to authenticated using (user_id = auth.uid());
create policy "users create their own todos" on public.daily_todos for insert to authenticated with check (user_id = auth.uid());
create policy "users update their own todos" on public.daily_todos for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete their own todos" on public.daily_todos for delete to authenticated using (user_id = auth.uid());

alter table public.dogs
add column if not exists avatar_key varchar(30) not null default 'maltese';
alter table public.dogs drop constraint if exists dogs_avatar_key_check;
alter table public.dogs add constraint dogs_avatar_key_check
check (avatar_key in ('maltese', 'poodle', 'pomeranian', 'bichon', 'shih-tzu'));

alter table public.room_items
add column if not exists z_index integer not null default 0;
alter table public.room_items drop constraint if exists room_items_z_index_check;
alter table public.room_items add constraint room_items_z_index_check
check (z_index between -1000 and 1000);

alter table public.mini_rooms drop constraint if exists mini_rooms_pet_id_fkey;
alter table public.mini_rooms add constraint mini_rooms_pet_id_fkey
foreign key (pet_id) references public.dogs(id) on delete cascade;

create table if not exists public.mini_room_chat_messages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.dogs(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  sender_name varchar(30) not null check (char_length(trim(sender_name)) between 1 and 30),
  message varchar(80) not null check (char_length(trim(message)) between 1 and 80),
  created_at timestamptz not null default now()
);

create index if not exists mini_room_chat_pet_created_idx
on public.mini_room_chat_messages (pet_id, created_at desc);
alter table public.mini_room_chat_messages enable row level security;
drop policy if exists "mini room chat is publicly readable" on public.mini_room_chat_messages;
drop policy if exists "visitors send mini room chat" on public.mini_room_chat_messages;
create policy "mini room chat is publicly readable" on public.mini_room_chat_messages for select to anon, authenticated using (true);
create policy "visitors send mini room chat" on public.mini_room_chat_messages for insert to anon, authenticated with check (sender_user_id is null or sender_user_id = auth.uid());

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mini_room_chat_messages'
  ) then
    alter publication supabase_realtime add table public.mini_room_chat_messages;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-images', 'profile-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload their profile image" on storage.objects;
drop policy if exists "users update their profile image" on storage.objects;
drop policy if exists "users delete their profile image" on storage.objects;
create policy "users upload their profile image" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update their profile image" on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete their profile image" on storage.objects for delete to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
