alter table public.dogs drop constraint if exists dogs_gender_check;
alter table public.dogs drop constraint if exists dogs_neutering_status_check;

alter table public.dogs alter column breed drop not null;
alter table public.dogs alter column birth_date drop not null;
alter table public.dogs alter column weight_kg drop not null;
alter table public.dogs alter column gender drop not null;
alter table public.dogs alter column gender set default 'UNKNOWN';
alter table public.dogs alter column neutering_status drop not null;
alter table public.dogs alter column neutering_status set default 'UNKNOWN';
alter table public.dogs alter column animal_registration_no drop not null;

alter table public.dogs
  add constraint dogs_gender_check
  check (gender is null or gender in ('MALE', 'FEMALE', 'UNKNOWN'));

alter table public.dogs
  add constraint dogs_neutering_status_check
  check (neutering_status is null or neutering_status in ('NEUTERED', 'NOT_NEUTERED', 'UNKNOWN'));
