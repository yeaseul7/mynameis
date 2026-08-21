insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-images', 'community-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload community images" on storage.objects;
create policy "members upload community images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "members update community images" on storage.objects;
create policy "members update community images" on storage.objects
  for update to authenticated
  using (bucket_id = 'community-images' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'community-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "members delete community images" on storage.objects;
create policy "members delete community images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
