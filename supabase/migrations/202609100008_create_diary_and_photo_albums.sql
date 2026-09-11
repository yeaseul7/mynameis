create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 3000),
  created_at timestamptz not null default now()
);

create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  diary_id uuid not null unique references public.diary_entries(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 3000),
  created_at timestamptz not null default now()
);

create table public.photo_album_images (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null unique,
  image_url text not null,
  sort_order smallint not null check (sort_order between 0 and 4),
  created_at timestamptz not null default now(),
  unique (album_id, sort_order)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('diary-images', 'diary-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.diary_entries enable row level security;
alter table public.photo_albums enable row level security;
alter table public.photo_album_images enable row level security;

create policy "owners manage diary entries" on public.diary_entries for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage photo albums" on public.photo_albums for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage photo album images" on public.photo_album_images for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "users upload diary images" on storage.objects for insert to authenticated
with check (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update diary images" on storage.objects for update to authenticated
using (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete diary images" on storage.objects for delete to authenticated
using (bucket_id = 'diary-images' and (storage.foldername(name))[1] = auth.uid()::text);
