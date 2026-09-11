create table if not exists public.mini_room_chat_messages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.dogs(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  sender_name varchar(30) not null check (char_length(trim(sender_name)) between 1 and 30),
  message varchar(150) not null check (char_length(trim(message)) between 1 and 150),
  created_at timestamptz not null default now()
);

create index if not exists mini_room_chat_pet_created_idx on public.mini_room_chat_messages(pet_id, created_at desc);
alter table public.mini_room_chat_messages enable row level security;
drop policy if exists "mini room chat is publicly readable" on public.mini_room_chat_messages;
drop policy if exists "visitors send mini room chat" on public.mini_room_chat_messages;
create policy "mini room chat is publicly readable" on public.mini_room_chat_messages for select to anon, authenticated using (true);
create policy "visitors send mini room chat" on public.mini_room_chat_messages for insert to anon, authenticated with check (sender_user_id is null or sender_user_id = auth.uid());

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'mini_room_chat_messages') then
    alter publication supabase_realtime add table public.mini_room_chat_messages;
  end if;
end $$;
