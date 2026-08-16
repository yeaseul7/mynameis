alter table public.dog_guestbook_entries
  add column if not exists author_id uuid references auth.users(id) on delete cascade,
  add column if not exists parent_id uuid references public.dog_guestbook_entries(id) on delete cascade,
  add column if not exists deleted_at timestamptz;

alter table public.dog_guestbook_entries
  alter column public_link_token drop not null;

create index if not exists dog_guestbook_entries_author_id_idx
  on public.dog_guestbook_entries(author_id);

create index if not exists dog_guestbook_entries_parent_id_created_at_idx
  on public.dog_guestbook_entries(parent_id, created_at asc);

alter table public.dog_guestbook_entries
  drop constraint if exists dog_guestbook_entries_message_length_check,
  add constraint dog_guestbook_entries_message_length_check
    check (length(trim(message)) between 1 and 180);

alter table public.dog_guestbook_entries
  drop constraint if exists dog_guestbook_entries_author_name_length_check,
  add constraint dog_guestbook_entries_author_name_length_check
    check (length(trim(author_name)) between 1 and 24);

alter table public.dog_guestbook_entries
  drop constraint if exists dog_guestbook_entries_not_self_reply_check,
  add constraint dog_guestbook_entries_not_self_reply_check
    check (parent_id is null or parent_id <> id);

create or replace function public.validate_dog_guestbook_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_record public.dog_guestbook_entries%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select *
  into parent_record
  from public.dog_guestbook_entries
  where id = new.parent_id;

  if parent_record.id is null then
    raise exception 'Parent guestbook entry does not exist';
  end if;

  if parent_record.dog_id <> new.dog_id then
    raise exception 'Reply must belong to the same dog';
  end if;

  if parent_record.parent_id is not null then
    raise exception 'Nested replies are not supported';
  end if;

  if parent_record.deleted_at is not null or parent_record.hidden_at is not null then
    raise exception 'Cannot reply to a deleted guestbook entry';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_dog_guestbook_parent_trigger on public.dog_guestbook_entries;
create trigger validate_dog_guestbook_parent_trigger
before insert or update of parent_id, dog_id
on public.dog_guestbook_entries
for each row
execute function public.validate_dog_guestbook_parent();

drop policy if exists "active public link guestbook entries are readable" on public.dog_guestbook_entries;
create policy "active public link guestbook entries are readable"
on public.dog_guestbook_entries
for select
using (
  hidden_at is null
  and deleted_at is null
  and (
    exists (
      select 1 from public.dog_public_links
      where dog_public_links.dog_id = dog_guestbook_entries.dog_id
        and dog_public_links.is_active = true
        and dog_public_links.revoked_at is null
        and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
    )
    or exists (
      select 1 from public.dogs
      where dogs.id = dog_guestbook_entries.dog_id
        and dogs.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "active public link guestbook entries can be created" on public.dog_guestbook_entries;

drop policy if exists "authenticated users can create own guestbook entries" on public.dog_guestbook_entries;
create policy "authenticated users can create own guestbook entries"
on public.dog_guestbook_entries
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and hidden_at is null
  and deleted_at is null
  and length(trim(author_name)) between 1 and 24
  and length(trim(message)) between 1 and 180
  and (
    exists (
      select 1 from public.dog_public_links
      where dog_public_links.dog_id = dog_guestbook_entries.dog_id
        and (dog_guestbook_entries.public_link_token is null or dog_public_links.token = dog_guestbook_entries.public_link_token)
        and dog_public_links.is_active = true
        and dog_public_links.revoked_at is null
        and (dog_public_links.expires_at is null or dog_public_links.expires_at > now())
    )
    or exists (
      select 1 from public.dogs
      where dogs.id = dog_guestbook_entries.dog_id
        and dogs.owner_id = (select auth.uid())
    )
  )
);

drop policy if exists "owners can hide guestbook entries" on public.dog_guestbook_entries;

drop policy if exists "authors can delete own guestbook entries" on public.dog_guestbook_entries;
create policy "authors can delete own guestbook entries"
on public.dog_guestbook_entries
for delete to authenticated
using (author_id = (select auth.uid()));
