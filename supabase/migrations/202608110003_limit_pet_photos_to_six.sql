alter table public.pet_photos
  drop constraint if exists pet_photos_position_check;

alter table public.pet_photos
  add constraint pet_photos_position_check check (position between 0 and 5);
