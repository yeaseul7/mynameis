alter table public.dog_care_profiles
  rename column walks_per_day to walks_per_week;

alter table public.dog_care_profiles
  drop constraint if exists dog_care_profiles_walks_per_day_check;

alter table public.dog_care_profiles
  add constraint dog_care_profiles_walks_per_week_check
    check (walks_per_week is null or walks_per_week between 0 and 70);
