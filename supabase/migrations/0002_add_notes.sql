-- Adds a Notes section. Run this once in your Supabase SQL editor (Project >
-- SQL Editor > New query) if you already set up decks/cards/folders before
-- notes existed — it only adds new things, so it's safe to run even if some
-- parts already exist.

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid references decks (id) on delete set null,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_id_idx on notes (user_id);
create index if not exists notes_deck_id_idx on notes (deck_id);

alter table notes enable row level security;

drop policy if exists "notes are owned by their creator" on notes;
create policy "notes are owned by their creator" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
