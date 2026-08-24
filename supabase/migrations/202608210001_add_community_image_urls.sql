alter table public.community_posts
  add column if not exists image_urls text[] not null default '{}';

update public.community_posts
set image_urls = array[cover_image_url]
where cover_image_url is not null
  and cardinality(image_urls) = 0;

alter table public.community_posts
  drop constraint if exists community_posts_image_urls_limit;

alter table public.community_posts
  add constraint community_posts_image_urls_limit
  check (cardinality(image_urls) <= 5);
