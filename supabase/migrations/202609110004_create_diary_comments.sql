create table if not exists public.diary_comments (
  id uuid primary key default gen_random_uuid(),
  diary_id uuid not null references public.diary_entries(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  author_name varchar(30) not null check (char_length(trim(author_name)) between 1 and 30),
  parent_id uuid references public.diary_comments(id) on delete cascade,
  content varchar(500) not null check (char_length(trim(content)) between 1 and 500),
  created_at timestamptz not null default now(),
  constraint diary_comments_not_self_reply check (parent_id is null or parent_id <> id)
);

create index if not exists diary_comments_diary_created_idx
on public.diary_comments (diary_id, created_at asc);

create index if not exists diary_comments_parent_created_idx
on public.diary_comments (parent_id, created_at asc);

create or replace function public.validate_diary_comment_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_record public.diary_comments%rowtype;
begin
  if new.parent_id is null then return new; end if;

  select * into parent_record from public.diary_comments where id = new.parent_id;
  if parent_record.id is null then raise exception 'Parent comment does not exist'; end if;
  if parent_record.diary_id <> new.diary_id then raise exception 'Reply must belong to the same diary'; end if;
  if parent_record.parent_id is not null then raise exception 'Nested replies are not supported'; end if;
  return new;
end;
$$;

drop trigger if exists validate_diary_comment_parent_trigger on public.diary_comments;
create trigger validate_diary_comment_parent_trigger
before insert or update of parent_id, diary_id on public.diary_comments
for each row execute function public.validate_diary_comment_parent();

alter table public.diary_comments enable row level security;

create policy "authenticated users read diary comments"
on public.diary_comments for select to authenticated using (true);

create policy "authenticated users create diary comments"
on public.diary_comments for insert to authenticated
with check (author_id = (select auth.uid()));

create policy "authors delete diary comments"
on public.diary_comments for delete to authenticated
using (author_id = (select auth.uid()));
