alter table public.community_comments
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

create table if not exists public.community_comment_likes (
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create or replace function public.sync_community_comment_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_comments
  set like_count = (select count(*)::integer from public.community_comment_likes where comment_id = coalesce(new.comment_id, old.comment_id))
  where id = coalesce(new.comment_id, old.comment_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_community_comment_like_count_trigger on public.community_comment_likes;
create trigger sync_community_comment_like_count_trigger after insert or delete on public.community_comment_likes for each row execute function public.sync_community_comment_like_count();

alter table public.community_comment_likes enable row level security;
revoke all on public.community_comment_likes from anon, authenticated;
