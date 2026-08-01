-- Adds a daily study streak to the profiles table. Run this once in your
-- Supabase SQL editor (Project > SQL Editor > New query) — it only adds
-- columns, so it's safe to run even if you already have some of this.

alter table profiles add column if not exists current_streak integer not null default 0;
alter table profiles add column if not exists longest_streak integer not null default 0;
alter table profiles add column if not exists last_active_date date;
