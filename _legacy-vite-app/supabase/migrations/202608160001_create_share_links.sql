create table if not exists public.share_links (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  mode text not null check (mode in ('care', 'lost')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists share_links_owner_id_idx on public.share_links(owner_id);
create index if not exists share_links_dog_id_idx on public.share_links(dog_id);

alter table public.share_links enable row level security;

drop policy if exists "Owners can manage their share links" on public.share_links;
create policy "Owners can manage their share links"
on public.share_links
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "Active share links are publicly readable" on public.share_links;
create policy "Active share links are publicly readable"
on public.share_links
for select
using (is_active = true);
