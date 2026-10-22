-- Run once in Supabase → SQL Editor to create the shared contest storage.
-- Security is intentionally open: anyone with the site can add, vote and delete.

create table if not exists costumes (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 60),
  entrant    text not null default '' check (char_length(entrant) <= 60),
  image      text not null check (char_length(image) < 2000000), -- resized JPEG as a data URL
  created_at timestamptz not null default now()
);

-- One row per voter: the primary key is what enforces "one vote each".
create table if not exists votes (
  voter_id   text primary key,
  costume_id bigint not null references costumes(id) on delete cascade,
  voted_at   timestamptz not null default now()
);

alter table costumes enable row level security;
alter table votes enable row level security;

drop policy if exists "open access" on costumes;
drop policy if exists "open access" on votes;
create policy "open access" on costumes for all to anon using (true) with check (true);
create policy "open access" on votes for all to anon using (true) with check (true);
