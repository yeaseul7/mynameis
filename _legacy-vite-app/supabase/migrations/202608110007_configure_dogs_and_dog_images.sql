create extension if not exists "pgcrypto";

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name varchar(50) not null,
  breed varchar(100) not null,
  birth_date date,
  weight_kg decimal(5, 2),
  gender varchar(10) not null check (gender in ('MALE', 'FEMALE')),
  neutering_status varchar(20) not null default 'UNKNOWN' check (neutering_status in ('NEUTERED', 'NOT_NEUTERED', 'UNKNOWN')),
  animal_registration_no varchar(50) unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (birth_date is null or birth_date <= current_date),
  check (weight_kg is null or weight_kg > 0)
);

create table if not exists public.dog_images (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  image_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_primary boolean not null default false,
  original_name varchar(255),
  mime_type varchar(100),
  file_size bigint check (file_size is null or file_size > 0),
  created_at timestamptz not null default now(),
  unique (dog_id, storage_key),
  unique (dog_id, sort_order)
);

create unique index if not exists dog_images_one_primary
  on public.dog_images(dog_id) where is_primary = true;

alter table public.dogs enable row level security;
alter table public.dog_images enable row level security;

drop policy if exists "owners manage dogs" on public.dogs;
create policy "owners manage dogs" on public.dogs
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners manage dog images" on public.dog_images;
create policy "owners manage dog images" on public.dog_images
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.dogs
      where dogs.id = dog_id and dogs.owner_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dog-images', 'dog-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "owners upload dog images" on storage.objects;
create policy "owners upload dog images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dog-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "owners update dog images" on storage.objects;
create policy "owners update dog images" on storage.objects
  for update to authenticated
  using (bucket_id = 'dog-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'dog-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "owners delete dog images" on storage.objects;
create policy "owners delete dog images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dog-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

create index if not exists idx_dogs_owner_id on public.dogs(owner_id);
create index if not exists idx_dog_images_owner_id on public.dog_images(owner_id);
