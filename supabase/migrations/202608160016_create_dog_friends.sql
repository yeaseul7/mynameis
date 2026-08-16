create table if not exists public.dog_friends (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  friend_dog_id uuid not null references public.dogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (owner_id, friend_dog_id),
  check (dog_id <> friend_dog_id)
);

create index if not exists dog_friends_owner_id_idx on public.dog_friends(owner_id);
create index if not exists dog_friends_dog_id_idx on public.dog_friends(dog_id);
create index if not exists dog_friends_friend_dog_id_idx on public.dog_friends(friend_dog_id);

alter table public.dog_friends enable row level security;

drop policy if exists "owners manage dog friends" on public.dog_friends;
create policy "owners manage dog friends" on public.dog_friends
for all to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.dogs
    where dogs.id = dog_id and dogs.owner_id = (select auth.uid())
  )
);

drop policy if exists "friends can read friend dogs" on public.dogs;
create policy "friends can read friend dogs" on public.dogs
for select to authenticated
using (
  exists (
    select 1 from public.dog_friends
    where dog_friends.friend_dog_id = dogs.id
      and dog_friends.owner_id = (select auth.uid())
  )
);

drop policy if exists "friends can read friend dog images" on public.dog_images;
create policy "friends can read friend dog images" on public.dog_images
for select to authenticated
using (
  exists (
    select 1 from public.dog_friends
    where dog_friends.friend_dog_id = dog_images.dog_id
      and dog_friends.owner_id = (select auth.uid())
  )
);
