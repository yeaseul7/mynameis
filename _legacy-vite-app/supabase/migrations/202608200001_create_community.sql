create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  slug varchar(140) not null unique,
  title varchar(120) not null,
  content text not null,
  content_format varchar(20) not null default 'PLAIN_TEXT' check (content_format in ('PLAIN_TEXT')),
  cover_image_url text,
  visibility varchar(20) not null default 'PUBLIC' check (visibility in ('PUBLIC','MEMBERS')),
  status varchar(20) not null default 'PUBLISHED' check (status in ('DRAFT','PUBLISHED','ARCHIVED')),
  seo_title varchar(70),
  seo_description varchar(160),
  view_count integer not null default 0 check (view_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  share_count integer not null default 0 check (share_count >= 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(title)) between 1 and 120),
  check (length(trim(content)) between 1 and 50000)
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body varchar(1000) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (length(trim(body)) between 1 and 1000)
);

create index if not exists community_posts_published_idx on public.community_posts(status, published_at desc, created_at desc);
create index if not exists community_posts_author_idx on public.community_posts(author_id, created_at desc);
create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at asc) where deleted_at is null;

create or replace function public.sync_community_comment_count() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.community_posts set comment_count = (
    select count(*)::integer from public.community_comments where post_id = coalesce(new.post_id, old.post_id) and deleted_at is null
  ) where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_community_comment_count_trigger on public.community_comments;
create trigger sync_community_comment_count_trigger after insert or update of deleted_at or delete on public.community_comments for each row execute function public.sync_community_comment_count();

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

create policy "authors manage community posts" on public.community_posts for all to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "authors manage community comments" on public.community_comments for all to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

revoke all on public.community_posts from anon, authenticated;
revoke all on public.community_comments from anon, authenticated;
