create table public.mini_room_chat_messages (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  sender_user_id uuid references public.profiles(user_id) on delete set null default auth.uid(),
  sender_name varchar(30) not null,
  message varchar(150) not null,
  created_at timestamptz not null default now(),
  constraint mini_room_chat_sender_length check (char_length(trim(sender_name)) between 1 and 30),
  constraint mini_room_chat_message_length check (char_length(trim(message)) between 1 and 150)
);

create index mini_room_chat_pet_created_idx on public.mini_room_chat_messages(pet_id, created_at desc);
alter table public.mini_room_chat_messages enable row level security;
create policy "mini room chat is publicly readable" on public.mini_room_chat_messages for select to anon, authenticated using (true);
create policy "visitors send mini room chat" on public.mini_room_chat_messages for insert to anon, authenticated with check (sender_user_id is null or sender_user_id = (select auth.uid()));
alter publication supabase_realtime add table public.mini_room_chat_messages;
