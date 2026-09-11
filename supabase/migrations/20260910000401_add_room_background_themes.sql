update public.mini_rooms
set background_key = 'default'
where background_key = 'empty-lavender-room';

alter table public.mini_rooms
  alter column background_key set default 'default';

alter table public.mini_rooms
  add constraint mini_rooms_background_theme
  check (background_key in ('default', 'heart', 'rose'));
