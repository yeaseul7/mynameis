create table if not exists public.dog_public_links (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('PROFILE', 'CARE', 'LOST')),
  token text not null unique,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists dog_public_links_owner_id_idx on public.dog_public_links(owner_id);
create index if not exists dog_public_links_dog_id_idx on public.dog_public_links(dog_id);
create index if not exists dog_public_links_token_idx on public.dog_public_links(token);
create unique index if not exists dog_public_links_one_active_type_idx
  on public.dog_public_links(dog_id, type)
  where is_active = true and revoked_at is null;

alter table public.dog_public_links enable row level security;

drop policy if exists "Owners can manage dog public links" on public.dog_public_links;
create policy "Owners can manage dog public links"
on public.dog_public_links
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "Active dog public links are publicly readable" on public.dog_public_links;
create policy "Active dog public links are publicly readable"
on public.dog_public_links
for select
using (
  is_active = true
  and revoked_at is null
  and (expires_at is null or expires_at > now())
);

drop policy if exists "active public link dogs are publicly readable" on public.dogs;
create policy "active public link dogs are publicly readable"
on public.dogs
for select
using (
  exists (
    select 1 from public.dog_public_links
    where dog_public_links.dog_id = dogs.id
      and dog_public_links.is_active = true
      and dog_public_links.revoked_at is null
      and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
  )
);

drop policy if exists "active public link dog images are publicly readable" on public.dog_images;
create policy "active public link dog images are publicly readable"
on public.dog_images
for select
using (
  exists (
    select 1 from public.dog_public_links
    where dog_public_links.dog_id = dog_images.dog_id
      and dog_public_links.is_active = true
      and dog_public_links.revoked_at is null
      and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
  )
);

drop policy if exists "active public link dog care profiles are publicly readable" on public.dog_care_profiles;
create policy "active public link dog care profiles are publicly readable"
on public.dog_care_profiles
for select
using (
  exists (
    select 1 from public.dog_public_links
    where dog_public_links.dog_id = dog_care_profiles.dog_id
      and dog_public_links.is_active = true
      and dog_public_links.revoked_at is null
      and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
  )
);
