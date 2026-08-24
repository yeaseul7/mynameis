alter table public.community_posts
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create or replace function public.sync_community_like_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_posts set like_count = (
    select count(*)::integer from public.community_likes where post_id = coalesce(new.post_id, old.post_id)
  ) where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_community_like_count_trigger on public.community_likes;
create trigger sync_community_like_count_trigger after insert or delete on public.community_likes for each row execute function public.sync_community_like_count();

alter table public.community_likes enable row level security;
revoke all on public.community_likes from anon, authenticated;
