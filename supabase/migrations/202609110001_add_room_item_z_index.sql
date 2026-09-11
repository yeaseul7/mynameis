alter table public.room_items
add column if not exists z_index integer not null default 0
check (z_index between -1000 and 1000);
