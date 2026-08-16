drop policy if exists "Owners can manage dog public links" on public.dog_public_links;
create policy "Owners can manage dog public links"
on public.dog_public_links
for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
