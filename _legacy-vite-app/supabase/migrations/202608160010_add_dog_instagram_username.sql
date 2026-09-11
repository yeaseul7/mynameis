alter table public.dogs
  add column if not exists instagram_username varchar(30);

alter table public.dogs
  drop constraint if exists dogs_instagram_username_check;

alter table public.dogs
  add constraint dogs_instagram_username_check
  check (
    instagram_username is null
    or instagram_username ~ '^[A-Za-z0-9._]{1,30}$'
  );
