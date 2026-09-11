create table if not exists public.mini_rooms (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.dogs(id) on delete cascade,
  background_key varchar(60) not null default 'default'
    check (background_key in ('default', 'heart', 'rose')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.room_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mini_rooms(id) on delete cascade,
  object_type varchar(20) not null check (object_type in ('furniture', 'pet')),
  asset_key varchar(60) not null,
  asset_url text,
  x numeric(6,3) not null check (x between 0 and 100),
  y numeric(6,3) not null check (y between 0 and 100),
  scale numeric(5,2) not null default 1 check (scale between 0.1 and 3),
  rotation numeric(6,2) not null default 0 check (rotation in (0, 180)),
  created_at timestamptz not null default now()
);

create index if not exists room_items_room_id_idx on public.room_items(room_id);

create or replace function public.touch_mini_room_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mini_rooms_set_updated_at on public.mini_rooms;
create trigger mini_rooms_set_updated_at before update on public.mini_rooms
for each row execute function public.touch_mini_room_updated_at();

alter table public.mini_rooms enable row level security;
alter table public.room_items enable row level security;

create policy "mini rooms are publicly readable" on public.mini_rooms
for select to anon, authenticated using (true);

create policy "dog owners create mini rooms" on public.mini_rooms
for insert to authenticated with check (
  exists (select 1 from public.dogs where dogs.id = pet_id and dogs.owner_id = (select auth.uid()))
);

create policy "dog owners update mini rooms" on public.mini_rooms
for update to authenticated using (
  exists (select 1 from public.dogs where dogs.id = pet_id and dogs.owner_id = (select auth.uid()))
) with check (
  exists (select 1 from public.dogs where dogs.id = pet_id and dogs.owner_id = (select auth.uid()))
);

create policy "dog owners delete mini rooms" on public.mini_rooms
for delete to authenticated using (
  exists (select 1 from public.dogs where dogs.id = pet_id and dogs.owner_id = (select auth.uid()))
);

create policy "room items are publicly readable" on public.room_items
for select to anon, authenticated using (true);

create policy "dog owners create room items" on public.room_items
for insert to authenticated with check (
  exists (
    select 1 from public.mini_rooms
    join public.dogs on dogs.id = mini_rooms.pet_id
    where mini_rooms.id = room_id and dogs.owner_id = (select auth.uid())
  )
);

create policy "dog owners update room items" on public.room_items
for update to authenticated using (
  exists (
    select 1 from public.mini_rooms
    join public.dogs on dogs.id = mini_rooms.pet_id
    where mini_rooms.id = room_id and dogs.owner_id = (select auth.uid())
  )
) with check (
  exists (
    select 1 from public.mini_rooms
    join public.dogs on dogs.id = mini_rooms.pet_id
    where mini_rooms.id = room_id and dogs.owner_id = (select auth.uid())
  )
);

create policy "dog owners delete room items" on public.room_items
for delete to authenticated using (
  exists (
    select 1 from public.mini_rooms
    join public.dogs on dogs.id = mini_rooms.pet_id
    where mini_rooms.id = room_id and dogs.owner_id = (select auth.uid())
  )
);
