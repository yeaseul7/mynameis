alter table public.dog_care_profiles
  add column if not exists walks_per_day smallint,
  add column if not exists toileting_type text;

alter table public.dog_care_profiles
  drop constraint if exists dog_care_profiles_walks_per_day_check,
  drop constraint if exists dog_care_profiles_toileting_type_check;

alter table public.dog_care_profiles
  add constraint dog_care_profiles_walks_per_day_check
    check (walks_per_day is null or walks_per_day between 0 and 10),
  add constraint dog_care_profiles_toileting_type_check
    check (toileting_type is null or toileting_type in ('INDOOR', 'OUTDOOR', 'BOTH'));
