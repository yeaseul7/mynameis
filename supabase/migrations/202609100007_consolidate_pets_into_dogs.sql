alter table public.dogs drop constraint if exists dogs_gender_check;
alter table public.dogs add constraint dogs_gender_check check (gender in ('MALE', 'FEMALE', 'UNKNOWN'));
alter table public.dogs alter column gender set default 'UNKNOWN';

insert into public.dogs (id, owner_id, name, breed, birth_date, gender, created_at, updated_at)
select id, owner_user_id, name, coalesce(breed, '미등록'), birth_date, 'UNKNOWN', created_at, updated_at
from public.pets on conflict (id) do nothing;

alter table public.mini_rooms drop constraint if exists mini_rooms_pet_id_fkey;
alter table public.mini_rooms add constraint mini_rooms_pet_id_fkey foreign key (pet_id) references public.dogs(id) on delete cascade;

drop policy if exists "pet owners create mini rooms" on public.mini_rooms;
drop policy if exists "pet owners update mini rooms" on public.mini_rooms;
drop policy if exists "pet owners delete mini rooms" on public.mini_rooms;
drop policy if exists "pet owners create room items" on public.room_items;
drop policy if exists "pet owners update room items" on public.room_items;
drop policy if exists "pet owners delete room items" on public.room_items;
drop table public.pets;
