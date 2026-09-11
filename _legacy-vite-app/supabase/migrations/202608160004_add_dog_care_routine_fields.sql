alter table public.dog_care_profiles
  add column if not exists meals_per_day smallint,
  add column if not exists marks_indoors boolean,
  add column if not exists fifth_vaccine_done boolean,
  add column if not exists daycare_experience boolean,
  add column if not exists has_allergy boolean,
  add column if not exists handoff_memo text;
