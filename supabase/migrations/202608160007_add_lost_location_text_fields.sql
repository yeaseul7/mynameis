alter table public.dog_care_profiles
  add column if not exists lost_location_district varchar(80),
  add column if not exists lost_location_neighborhood varchar(80),
  add column if not exists lost_location_detail text;

update public.dog_care_profiles
set lost_location_address = trim(concat_ws(' ', lost_location_district, lost_location_neighborhood, lost_location_detail))
where lost_location_address is null
  and (
    lost_location_district is not null
    or lost_location_neighborhood is not null
    or lost_location_detail is not null
  );
