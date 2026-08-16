alter table public.dogs
  add column if not exists invite_code varchar(10);

update public.dogs
set invite_code = 'MNS-' || upper(substr(replace(id::text, '-', ''), 1, 6))
where invite_code is null;

create unique index if not exists dogs_invite_code_key
  on public.dogs(invite_code)
  where invite_code is not null;

alter table public.dogs
  add constraint dogs_invite_code_format
  check (invite_code is null or invite_code ~ '^MNS-[A-Z0-9]{6}$');
