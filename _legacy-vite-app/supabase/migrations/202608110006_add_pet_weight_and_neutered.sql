alter table public.pets
  add column if not exists weight_kg numeric(5,2),
  add column if not exists is_neutered boolean;

alter table public.pets
  drop constraint if exists pets_weight_kg_check;

alter table public.pets
  add constraint pets_weight_kg_check
  check (weight_kg is null or (weight_kg > 0 and weight_kg <= 200));

comment on column public.pets.weight_kg is '반려동물 몸무게(kg)';
comment on column public.pets.is_neutered is '중성화 여부';
