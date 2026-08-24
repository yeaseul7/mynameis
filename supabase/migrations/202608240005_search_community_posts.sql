create or replace function public.search_community_post_ids(
  search_term text,
  sort_mode text default 'latest',
  result_offset integer default 0,
  result_limit integer default 3
)
returns table(id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select community_posts.id
  from public.community_posts
  join auth.users on auth.users.id = community_posts.author_id
  where community_posts.status = 'PUBLISHED'
    and (
      position(lower(search_term) in lower(community_posts.title)) > 0
      or position(lower(search_term) in lower(coalesce(auth.users.raw_user_meta_data ->> 'name', ''))) > 0
      or position(lower(search_term) in lower(coalesce(auth.users.raw_user_meta_data ->> 'full_name', ''))) > 0
    )
  order by
    case when sort_mode = 'popular' then community_posts.like_count end desc nulls last,
    case when sort_mode = 'popular' then community_posts.comment_count end desc nulls last,
    community_posts.published_at desc nulls last,
    community_posts.created_at desc,
    community_posts.id desc
  offset greatest(result_offset, 0)
  limit least(greatest(result_limit, 1), 21);
$$;

revoke all on function public.search_community_post_ids(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.search_community_post_ids(text, text, integer, integer) to service_role;
