create or replace function public.record_dog_found_location(
  public_token text,
  found_lat double precision,
  found_lng double precision
)
returns table (
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
begin
  if found_lat is null or found_lng is null
    or found_lat < -90 or found_lat > 90
    or found_lng < -180 or found_lng > 180 then
    raise exception 'Invalid coordinates';
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

  insert into public.dog_care_profiles (
    dog_id,
    owner_id,
    emergency_contact_1,
    lost_location_lat,
    lost_location_lng,
    lost_at,
    updated_at
  )
  values (
    link_record.dog_id,
    link_record.owner_id,
    '',
    found_lat,
    found_lng,
    now(),
    now()
  )
  on conflict (dog_id) do update set
    lost_location_lat = excluded.lost_location_lat,
    lost_location_lng = excluded.lost_location_lng,
    lost_at = coalesce(public.dog_care_profiles.lost_at, excluded.lost_at),
    updated_at = now();

  return query
  select
    dog_care_profiles.lost_location_lat,
    dog_care_profiles.lost_location_lng,
    dog_care_profiles.lost_at
  from public.dog_care_profiles
  where dog_id = link_record.dog_id;
end;
$$;

grant execute on function public.record_dog_found_location(text, double precision, double precision) to anon, authenticated;
