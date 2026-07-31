-- Adds folders for organizing decks. Run this once in your Supabase SQL
-- editor (Project > SQL Editor > New query) if you already set up
-- decks/cards/card_progress from schema.sql before folders existed — it
-- only adds new things, so it's safe to run even if some parts already exist.

create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table decks add column if not exists folder_id uuid references folders (id) on delete set null;

create index if not exists folders_user_id_idx on folders (user_id);
create index if not exists decks_folder_id_idx on decks (folder_id);

alter table folders enable row level security;

drop policy if exists "folders are owned by their creator" on folders;
create policy "folders are owned by their creator" on folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
