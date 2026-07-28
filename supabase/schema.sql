-- Chinese flashcard app schema.
-- Run this in the Supabase SQL editor for your project (Project > SQL Editor > New query).

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks (id) on delete cascade,
  hanzi text not null,
  pinyin text not null default '',
  definition text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists card_progress (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ease real not null default 2.5,
  interval_days real not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  unique (card_id, user_id)
);

create index if not exists cards_deck_id_idx on cards (deck_id);
create index if not exists decks_user_id_idx on decks (user_id);
create index if not exists card_progress_user_due_idx on card_progress (user_id, due_at);

alter table decks enable row level security;
alter table cards enable row level security;
alter table card_progress enable row level security;

create policy "decks are owned by their creator" on decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cards are visible through owned decks" on cards
  for all using (
    exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
  ) with check (
    exists (select 1 from decks where decks.id = cards.deck_id and decks.user_id = auth.uid())
  );

create policy "card_progress is owned by its creator" on card_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
