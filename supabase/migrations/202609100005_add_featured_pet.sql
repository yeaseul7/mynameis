alter table public.profiles
add column featured_pet_id uuid references public.pets(id) on delete set null;

comment on column public.profiles.featured_pet_id is '미니홈피 왼쪽에 표시할 대표 강아지. null이면 사용자 프로필 표시';
