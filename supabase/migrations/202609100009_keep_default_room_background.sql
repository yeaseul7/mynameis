update public.mini_rooms set background_key = 'default' where background_key <> 'default';

alter table public.mini_rooms drop constraint if exists mini_rooms_background_theme;
alter table public.mini_rooms drop constraint if exists mini_rooms_background_key_check;
alter table public.mini_rooms add constraint mini_rooms_background_theme check (background_key = 'default');
