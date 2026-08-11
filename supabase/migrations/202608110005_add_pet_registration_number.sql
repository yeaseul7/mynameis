alter table public.pets
  add column if not exists registration_number text;

alter table public.pets
  drop constraint if exists pets_registration_number_check;

alter table public.pets
  add constraint pets_registration_number_check
  check (registration_number is null or registration_number ~ '^[0-9]{15}$');

create unique index if not exists pets_registration_number_unique_idx
  on public.pets(registration_number)
  where registration_number is not null;
