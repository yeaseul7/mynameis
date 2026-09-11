alter table public.dog_care_profiles
  add column if not exists takes_medication boolean,
  add column if not exists primary_hospital varchar(100),
  add column if not exists primary_hospital_address text,
  add column if not exists primary_hospital_phone varchar(30),
  add column if not exists emergency_note text,
  add column if not exists emergency_contact_1 varchar(30),
  add column if not exists emergency_contact_2 varchar(30),
  add column if not exists meals_per_day smallint,
  add column if not exists marks_indoors boolean,
  add column if not exists fifth_vaccine_done boolean,
  add column if not exists daycare_experience boolean,
  add column if not exists has_allergy boolean,
  add column if not exists handoff_memo text;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dog_care_profiles'
      and column_name = 'emergency_contact_phone'
  ) then
    execute '
      update public.dog_care_profiles
      set emergency_contact_1 = coalesce(emergency_contact_1, emergency_contact_phone)
      where emergency_contact_1 is null
    ';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dog_care_profiles'
      and column_name = 'emergency_memo'
  ) then
    execute '
      update public.dog_care_profiles
      set emergency_note = coalesce(emergency_note, emergency_memo)
      where emergency_note is null
    ';
  end if;
end $$;

alter table public.dog_care_profiles
  alter column emergency_contact_1 drop not null,
  alter column meals_per_day drop not null,
  alter column handoff_memo drop not null;

alter table public.dog_care_profiles
  drop column if exists emergency_contact_name,
  drop column if exists emergency_contact_phone,
  drop column if exists emergency_memo,
  drop column if exists meal_guide,
  drop column if exists allergy_memo,
  drop column if exists medication_memo,
  drop column if exists care_memo;

alter table public.dog_care_profiles
  drop constraint if exists dog_care_profiles_emergency_contact_name_check,
  drop constraint if exists dog_care_profiles_emergency_contact_phone_check,
  drop constraint if exists dog_care_profiles_meal_guide_check,
  drop constraint if exists dog_care_profiles_care_memo_check;

alter table public.dog_care_profiles
  add constraint dog_care_profiles_emergency_contact_1_check
  check (char_length(trim(emergency_contact_1)) > 0);
