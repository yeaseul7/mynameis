alter table public.community_posts
  drop constraint if exists community_posts_content_format_check;

alter table public.community_posts
  add constraint community_posts_content_format_check
  check (content_format in ('PLAIN_TEXT', 'RICH_HTML'));

alter table public.community_posts
  drop constraint if exists community_posts_content_check;

alter table public.community_posts
  add constraint community_posts_content_check
  check (length(trim(content)) between 1 and 100000);
