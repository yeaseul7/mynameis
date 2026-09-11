create table if not exists public.dog_care_profiles (
  dog_id uuid primary key references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  takes_medication boolean,
  primary_hospital varchar(100),
  primary_hospital_address text,
  primary_hospital_phone varchar(30),
  emergency_note text,
  emergency_contact_1 varchar(30) not null,
  emergency_contact_2 varchar(30),
  meals_per_day smallint,
  marks_indoors boolean,
  fifth_vaccine_done boolean,
  daycare_experience boolean,
  has_allergy boolean,
  handoff_memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(emergency_contact_1)) > 0)
);

create index if not exists dog_care_profiles_owner_id_idx on public.dog_care_profiles(owner_id);

alter table public.dog_care_profiles enable row level security;

drop policy if exists "owners manage dog care profiles" on public.dog_care_profiles;
create policy "owners manage dog care profiles"
on public.dog_care_profiles
for all to authenticated
using (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.dogs
    where dogs.id = dog_id and dogs.owner_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1 from public.dogs
    where dogs.id = dog_id and dogs.owner_id = (select auth.uid())
  )
);

drop policy if exists "active share dog care profiles are publicly readable" on public.dog_care_profiles;
create policy "active share dog care profiles are publicly readable"
on public.dog_care_profiles
for select
using (
  exists (
    select 1 from public.share_links
    where share_links.dog_id = dog_care_profiles.dog_id
      and share_links.is_active = true
  )
);
