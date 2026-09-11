alter table public.dog_care_profiles
  add column if not exists lost_location_address text,
  add column if not exists lost_location_district varchar(80),
  add column if not exists lost_location_neighborhood varchar(80),
  add column if not exists lost_location_detail text,
  add column if not exists lost_location_lat double precision,
  add column if not exists lost_location_lng double precision,
  add column if not exists lost_at timestamptz;
