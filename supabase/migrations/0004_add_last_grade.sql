-- Adds last_grade to card_progress, so the study page can group a deck's
-- cards by how they were last answered (Again/Hard/Good/Easy) and let you
-- restudy just one or more of those groups. Run this once in your Supabase
-- SQL editor (Project > SQL Editor > New query) — it only adds a column, so
-- it's safe to run even if you're not sure whether you already have it.

alter table card_progress add column if not exists last_grade text;
