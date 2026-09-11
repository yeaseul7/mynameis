create table public.mini_rooms (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null unique references public.pets(id) on delete cascade,
  background_key varchar(60) not null default 'empty-lavender-room',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_assets (
  asset_key varchar(60) primary key,
  name varchar(60) not null,
  category varchar(30) not null,
  asset_url text not null,
  thumbnail_url text not null,
  created_at timestamptz not null default now()
);

create table public.room_items (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mini_rooms(id) on delete cascade,
  object_type varchar(20) not null check (object_type in ('furniture', 'pet')),
  asset_key varchar(60) not null,
  asset_url text,
  x numeric(6,3) not null check (x between 0 and 100),
  y numeric(6,3) not null check (y between 0 and 100),
  scale numeric(5,2) not null default 1 check (scale between 0.1 and 3),
  rotation numeric(6,2) not null default 0 check (rotation between -180 and 180),
  created_at timestamptz not null default now()
);

create index room_items_room_id_idx on public.room_items(room_id);
create trigger mini_rooms_set_updated_at before update on public.mini_rooms for each row execute function public.set_updated_at();

insert into public.room_assets (asset_key, name, category, asset_url, thumbnail_url) values
  ('lavender-bed', '라벤더 침대', 'bed', '/room-assets/lavender-dog-bed.png', '/room-assets/lavender-dog-bed.png'),
  ('rug-cream', '크림 러그', 'rug', '/room-assets/rug-cream.png', '/room-assets/rug-cream.png'),
  ('rug-pink-heart', '핑크 하트 러그', 'rug', '/room-assets/rug-pink-heart.png', '/room-assets/rug-pink-heart.png'),
  ('rug-green', '그린 러그', 'rug', '/room-assets/rug-green.png', '/room-assets/rug-green.png'),
  ('cushion-vintage-floral', '빈티지 꽃 방석', 'cushion', '/room-assets/cushion-vintage-floral.png', '/room-assets/cushion-vintage-floral.png'),
  ('cushion-cream-paw', '크림 발자국 방석', 'cushion', '/room-assets/cushion-cream-paw.png', '/room-assets/cushion-cream-paw.png'),
  ('cushion-pink-heart', '핑크 하트 방석', 'cushion', '/room-assets/cushion-pink-heart.png', '/room-assets/cushion-pink-heart.png'),
  ('bowl-cream-double', '크림 2구 식기', 'bowl', '/room-assets/bowl-cream-double.png', '/room-assets/bowl-cream-double.png'),
  ('bowl-cream-kibble', '크림 사료 그릇', 'bowl', '/room-assets/bowl-cream-kibble.png', '/room-assets/bowl-cream-kibble.png'),
  ('bowl-cream-water', '크림 물그릇', 'bowl', '/room-assets/bowl-cream-water.png', '/room-assets/bowl-cream-water.png'),
  ('bowl-pink-double', '핑크 2구 식기', 'bowl', '/room-assets/bowl-pink-double.png', '/room-assets/bowl-pink-double.png'),
  ('bowl-pink-kibble', '핑크 사료 그릇', 'bowl', '/room-assets/bowl-pink-kibble.png', '/room-assets/bowl-pink-kibble.png'),
  ('bowl-pink-water', '핑크 물그릇', 'bowl', '/room-assets/bowl-pink-water.png', '/room-assets/bowl-pink-water.png'),
  ('bowl-vintage-double', '빈티지 2구 식기', 'bowl', '/room-assets/bowl-vintage-double.png', '/room-assets/bowl-vintage-double.png'),
  ('bowl-vintage-kibble', '빈티지 사료 그릇', 'bowl', '/room-assets/bowl-vintage-kibble.png', '/room-assets/bowl-vintage-kibble.png'),
  ('bowl-vintage-water', '빈티지 물그릇', 'bowl', '/room-assets/bowl-vintage-water.png', '/room-assets/bowl-vintage-water.png'),
  ('lavender-plant', '라벤더 화분', 'plant', '/room-assets/lavender-plant.png', '/room-assets/lavender-plant.png')
  ,('window-floral-tall', '로즈 세로 창문', 'window', '/room-assets/window-floral-tall.png', '/room-assets/window-floral-tall.png')
  ,('window-floral-wide', '로즈 가로 창문', 'window', '/room-assets/window-floral-wide.png', '/room-assets/window-floral-wide.png')
  ,('window-heart-tall', '하트 세로 창문', 'window', '/room-assets/window-heart-tall.png', '/room-assets/window-heart-tall.png')
  ,('window-heart-wide', '하트 가로 창문', 'window', '/room-assets/window-heart-wide.png', '/room-assets/window-heart-wide.png')
  ,('window-cream-tall', '크림 세로 창문', 'window', '/room-assets/window-cream-tall.png', '/room-assets/window-cream-tall.png')
  ,('window-cream-wide', '크림 가로 창문', 'window', '/room-assets/window-cream-wide.png', '/room-assets/window-cream-wide.png')
on conflict (asset_key) do nothing;

alter table public.mini_rooms enable row level security;
alter table public.room_assets enable row level security;
alter table public.room_items enable row level security;

create policy "mini rooms are publicly readable" on public.mini_rooms for select to anon, authenticated using (true);
create policy "room assets are publicly readable" on public.room_assets for select to anon, authenticated using (true);
create policy "room items are publicly readable" on public.room_items for select to anon, authenticated using (true);
create policy "pet owners create mini rooms" on public.mini_rooms for insert to authenticated with check (exists (select 1 from public.pets where pets.id = pet_id and pets.owner_user_id = (select auth.uid())));
create policy "pet owners update mini rooms" on public.mini_rooms for update to authenticated using (exists (select 1 from public.pets where pets.id = pet_id and pets.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.pets where pets.id = pet_id and pets.owner_user_id = (select auth.uid())));
create policy "pet owners delete mini rooms" on public.mini_rooms for delete to authenticated using (exists (select 1 from public.pets where pets.id = pet_id and pets.owner_user_id = (select auth.uid())));
create policy "pet owners create room items" on public.room_items for insert to authenticated with check (exists (select 1 from public.mini_rooms join public.pets on pets.id = mini_rooms.pet_id where mini_rooms.id = room_id and pets.owner_user_id = (select auth.uid())));
create policy "pet owners update room items" on public.room_items for update to authenticated using (exists (select 1 from public.mini_rooms join public.pets on pets.id = mini_rooms.pet_id where mini_rooms.id = room_id and pets.owner_user_id = (select auth.uid()))) with check (exists (select 1 from public.mini_rooms join public.pets on pets.id = mini_rooms.pet_id where mini_rooms.id = room_id and pets.owner_user_id = (select auth.uid())));
create policy "pet owners delete room items" on public.room_items for delete to authenticated using (exists (select 1 from public.mini_rooms join public.pets on pets.id = mini_rooms.pet_id where mini_rooms.id = room_id and pets.owner_user_id = (select auth.uid())));
