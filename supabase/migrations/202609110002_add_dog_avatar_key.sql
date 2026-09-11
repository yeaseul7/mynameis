alter table public.dogs
add column if not exists avatar_key varchar(30) not null default 'maltese'
check (avatar_key in ('maltese', 'poodle', 'pomeranian', 'bichon', 'shih-tzu'));
