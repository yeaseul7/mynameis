create table if not exists public.dog_found_location_reports (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  public_link_token text references public.dog_public_links(token) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy_meters double precision,
  note text,
  status text not null default 'NEW' check (status in ('NEW', 'CONFIRMED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (latitude between -90 and 90),
  check (longitude between -180 and 180),
  check (accuracy_meters is null or accuracy_meters >= 0),
  check (note is null or char_length(trim(note)) <= 500)
);

create index if not exists dog_found_location_reports_dog_id_created_at_idx
  on public.dog_found_location_reports(dog_id, created_at desc);

create index if not exists dog_found_location_reports_owner_id_created_at_idx
  on public.dog_found_location_reports(owner_id, created_at desc);

create index if not exists dog_found_location_reports_public_link_token_idx
  on public.dog_found_location_reports(public_link_token);

alter table public.dog_found_location_reports enable row level security;

drop function if exists public.record_dog_found_location(text, double precision, double precision);

drop policy if exists "owners can read found location reports" on public.dog_found_location_reports;
create policy "owners can read found location reports"
on public.dog_found_location_reports
for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists "owners can review found location reports" on public.dog_found_location_reports;
create policy "owners can review found location reports"
on public.dog_found_location_reports
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists "owners can delete found location reports" on public.dog_found_location_reports;
create policy "owners can delete found location reports"
on public.dog_found_location_reports
for delete to authenticated
using (owner_id = (select auth.uid()));

create or replace function public.record_dog_found_location(
  public_token text,
  found_lat double precision,
  found_lng double precision,
  found_accuracy double precision default null,
  found_note text default null
)
returns table (
  report_id uuid,
  lost_location_lat double precision,
  lost_location_lng double precision,
  lost_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  link_record public.dog_public_links%rowtype;
  inserted_report_id uuid;
begin
  if found_lat is null or found_lng is null
    or found_lat < -90 or found_lat > 90
    or found_lng < -180 or found_lng > 180 then
    raise exception 'Invalid coordinates';
  end if;

  if found_accuracy is not null and found_accuracy < 0 then
    raise exception 'Invalid accuracy';
  end if;

  select *
  into link_record
  from public.dog_public_links
  where token = public_token
    and type = 'LOST'
    and is_active = true
    and revoked_at is null
    and (expires_at is null or expires_at > now());

  if link_record.id is null then
    raise exception 'Invalid public link';
  end if;

  insert into public.dog_found_location_reports (
    dog_id,
    owner_id,
    public_link_token,
    reporter_id,
    latitude,
    longitude,
    accuracy_meters,
    note
  )
  values (
    link_record.dog_id,
    link_record.owner_id,
    public_token,
    auth.uid(),
    found_lat,
    found_lng,
    found_accuracy,
    nullif(trim(coalesce(found_note, '')), '')
  )
  returning id into inserted_report_id;

  return query
  select
    inserted_report_id,
    found_lat,
    found_lng,
    dog_care_profiles.lost_at
  from public.dog_care_profiles
  where dog_id = link_record.dog_id;
end;
$$;

grant execute on function public.record_dog_found_location(text, double precision, double precision, double precision, text) to anon, authenticated;
