alter table public.pets
  add column if not exists birth_date date;

update public.pets
set birth_date = current_date
where birth_date is null;

alter table public.pets
  alter column birth_date set not null;

alter table public.pets
  drop column if exists age;

alter table public.pets
  drop constraint if exists pets_birth_date_check;

alter table public.pets
  add constraint pets_birth_date_check check (birth_date <= current_date);
