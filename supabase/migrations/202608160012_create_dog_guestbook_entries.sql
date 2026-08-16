create table if not exists public.dog_guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  public_link_token text not null references public.dog_public_links(token) on delete cascade,
  author_name varchar(24) not null,
  message varchar(180) not null,
  created_at timestamptz not null default now(),
  hidden_at timestamptz
);

create index if not exists dog_guestbook_entries_dog_id_created_at_idx
  on public.dog_guestbook_entries(dog_id, created_at desc);

create index if not exists dog_guestbook_entries_public_link_token_idx
  on public.dog_guestbook_entries(public_link_token);

alter table public.dog_guestbook_entries enable row level security;

drop policy if exists "active public link guestbook entries are readable" on public.dog_guestbook_entries;
create policy "active public link guestbook entries are readable"
on public.dog_guestbook_entries
for select
using (
  hidden_at is null
  and exists (
    select 1 from public.dog_public_links
    where dog_public_links.token = dog_guestbook_entries.public_link_token
      and dog_public_links.dog_id = dog_guestbook_entries.dog_id
      and dog_public_links.is_active = true
      and dog_public_links.revoked_at is null
      and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
  )
);

drop policy if exists "active public link guestbook entries can be created" on public.dog_guestbook_entries;
create policy "active public link guestbook entries can be created"
on public.dog_guestbook_entries
for insert
with check (
  hidden_at is null
  and length(trim(author_name)) between 1 and 24
  and length(trim(message)) between 1 and 180
  and exists (
    select 1 from public.dog_public_links
    where dog_public_links.token = dog_guestbook_entries.public_link_token
      and dog_public_links.dog_id = dog_guestbook_entries.dog_id
      and dog_public_links.is_active = true
      and dog_public_links.revoked_at is null
      and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
  )
);

drop policy if exists "owners can hide guestbook entries" on public.dog_guestbook_entries;
create policy "owners can hide guestbook entries"
on public.dog_guestbook_entries
for update to authenticated
using (
  exists (
    select 1 from public.dogs
    where dogs.id = dog_guestbook_entries.dog_id
      and dogs.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.dogs
    where dogs.id = dog_guestbook_entries.dog_id
      and dogs.owner_id = (select auth.uid())
  )
);
