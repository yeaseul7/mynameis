alter table public.dogs
  add column if not exists residence_district text;

alter table public.dogs
  drop constraint if exists dogs_residence_district_length_check;

alter table public.dogs
  add constraint dogs_residence_district_length_check
    check (residence_district is null or char_length(residence_district) between 2 and 40);
