create extension if not exists "pgcrypto";

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname varchar(30) not null,
  bio varchar(100),
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_nickname_length check (char_length(trim(nickname)) between 1 and 30)
);

create unique index profiles_nickname_unique on public.profiles (lower(nickname));

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id) on delete cascade,
  slug varchar(50) not null,
  name varchar(30) not null,
  breed varchar(50),
  birth_date date,
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pets_name_length check (char_length(trim(name)) between 1 and 30),
  constraint pets_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  constraint pets_birth_date_valid check (birth_date is null or birth_date <= current_date),
  constraint pets_owner_slug_unique unique (owner_user_id, slug)
);

create index pets_owner_user_id_idx on public.pets (owner_user_id, created_at desc);
create unique index pets_public_slug_unique on public.pets (lower(slug));

create table public.mongchon (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references public.profiles(user_id) on delete cascade,
  following_user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint mongchon_unique unique (follower_user_id, following_user_id),
  constraint mongchon_no_self_follow check (follower_user_id <> following_user_id)
);

create index mongchon_following_idx on public.mongchon (following_user_id, created_at desc);

create table public.profile_visits (
  id uuid primary key default gen_random_uuid(),
  profile_user_id uuid not null references public.profiles(user_id) on delete cascade,
  visitor_user_id uuid references public.profiles(user_id) on delete set null,
  visitor_key varchar(100) not null,
  visit_date date not null default current_date,
  first_visited_at timestamptz not null default now(),
  last_visited_at timestamptz not null default now(),
  visit_count integer not null default 1,
  constraint profile_visits_count_positive check (visit_count > 0),
  constraint profile_visits_visitor_key_present check (char_length(trim(visitor_key)) between 1 and 100),
  constraint profile_visits_daily_unique unique (profile_user_id, visitor_key, visit_date)
);

create index profile_visits_profile_date_idx on public.profile_visits (profile_user_id, visit_date desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger pets_set_updated_at before update on public.pets
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  base_nickname text;
begin
  base_nickname := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nickname'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '멍친구'
  );
  insert into public.profiles (user_id, nickname)
  values (new.id, left(base_nickname, 22) || '-' || substr(replace(new.id::text, '-', ''), 1, 7));
  return new;
end;
$$;

create trigger auth_user_created_create_profile after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.record_profile_visit(
  p_profile_user_id uuid,
  p_anonymous_visitor_key varchar default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_visitor_id uuid := auth.uid();
  resolved_visitor_key varchar(100);
begin
  if current_visitor_id = p_profile_user_id then return; end if;
  resolved_visitor_key := case
    when current_visitor_id is not null then 'user:' || current_visitor_id::text
    else 'anonymous:' || left(coalesce(nullif(trim(p_anonymous_visitor_key), ''), 'unknown'), 90)
  end;
  insert into public.profile_visits (profile_user_id, visitor_user_id, visitor_key)
  values (p_profile_user_id, current_visitor_id, resolved_visitor_key)
  on conflict (profile_user_id, visitor_key, visit_date)
  do update set last_visited_at = now(), visit_count = public.profile_visits.visit_count + 1;
end;
$$;

revoke all on function public.record_profile_visit(uuid, varchar) from public;
grant execute on function public.record_profile_visit(uuid, varchar) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.mongchon enable row level security;
alter table public.profile_visits enable row level security;

create policy "profiles are publicly readable" on public.profiles for select to anon, authenticated using (true);
create policy "users insert their own profile" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update their own profile" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "pets are publicly readable" on public.pets for select to anon, authenticated using (true);
create policy "owners create pets" on public.pets for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy "owners update pets" on public.pets for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy "owners delete pets" on public.pets for delete to authenticated using (owner_user_id = (select auth.uid()));

create policy "mongchon relationships are publicly readable" on public.mongchon for select to anon, authenticated using (true);
create policy "users follow as themselves" on public.mongchon for insert to authenticated with check (follower_user_id = (select auth.uid()));
create policy "users remove their own follows" on public.mongchon for delete to authenticated using (follower_user_id = (select auth.uid()));

create policy "profile owners read their visits" on public.profile_visits for select to authenticated using (profile_user_id = (select auth.uid()));

comment on table public.mongchon is '단방향 멍촌 팔로우 관계';
comment on column public.profile_visits.visitor_key is 'user:{uuid} 또는 anonymous:{클라이언트 익명 키}';
