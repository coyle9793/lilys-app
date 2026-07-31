-- Adds a coin balance per user, earned by completing study sessions. Run
-- this once in your Supabase SQL editor (Project > SQL Editor > New query)
-- if you already set up decks/cards/folders/notes before coins existed — it
-- only adds new things, so it's safe to run even if some parts already exist.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  coins integer not null default 0
);

alter table profiles enable row level security;

drop policy if exists "profiles are owned by their creator" on profiles;
create policy "profiles are owned by their creator" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
