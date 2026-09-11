create extension if not exists "pgcrypto";

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  breed text not null check (char_length(breed) between 1 and 30),
  birth_date date not null check (birth_date <= current_date),
  weight_kg numeric(5,2) not null check (weight_kg > 0 and weight_kg <= 200),
  registration_number text unique check (registration_number is null or registration_number ~ '^[0-9]{15}$'),
  gender text not null check (gender in ('남아', '여아')),
  is_neutered boolean not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  position smallint not null default 0 check (position between 0 and 4),
  created_at timestamptz not null default now()
);

create index if not exists pets_owner_id_idx on public.pets(owner_id);
create index if not exists pet_photos_pet_id_position_idx on public.pet_photos(pet_id, position);

alter table public.pets enable row level security;
alter table public.pet_photos enable row level security;

create policy "owners manage pets" on public.pets
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "public profiles are readable" on public.pets
  for select to anon, authenticated
  using (is_public = true or owner_id = (select auth.uid()));

create policy "owners manage pet photos" on public.pet_photos
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "public pet photos metadata is readable" on public.pet_photos
  for select to anon, authenticated
  using (exists (select 1 from public.pets where pets.id = pet_id and pets.is_public = true));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pet-photos', 'pet-photos', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "owners upload pet photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "owners read pet photo objects" on storage.objects
  for select to authenticated
  using (bucket_id = 'pet-photos' and owner_id = (select auth.uid()::text));

create policy "owners delete pet photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pet-photos' and owner_id = (select auth.uid()::text));
