create or replace function public.increment_community_share_count(target_post_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count bigint;
begin
  update public.community_posts
  set share_count = coalesce(share_count, 0) + 1
  where id = target_post_id
    and status = 'PUBLISHED'
  returning share_count into updated_count;

  if updated_count is null then
    raise exception 'published community post not found';
  end if;

  return updated_count;
end;
$$;

revoke all on function public.increment_community_share_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_community_share_count(uuid) to service_role;
