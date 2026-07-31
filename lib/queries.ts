import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, CardProgress, Deck, Folder, Note } from "@/lib/types";
import type { Grade } from "@/lib/srs/sm2";

/** Cards due for review: never studied, or whose scheduled due date has passed. */
export function filterDueCards(cards: Card[], progress: Map<string, CardProgress>): Card[] {
  const now = Date.now();
  return cards.filter((c) => {
    const p = progress.get(c.id);
    return !p || new Date(p.due_at).getTime() <= now;
  });
}

/** Groups cards by how they were last graded (Again/Hard/Good/Easy) — never-graded cards are left out. */
export function groupCardsByLastGrade(
  cards: Card[],
  progress: Map<string, CardProgress>,
): Record<Grade, Card[]> {
  const groups: Record<Grade, Card[]> = { again: [], hard: [], good: [], easy: [] };
  for (const card of cards) {
    const grade = progress.get(card.id)?.last_grade;
    if (grade) groups[grade].push(card);
  }
  return groups;
}

export async function getFolders(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Folder[];
}

export async function getCoins(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.from("profiles").select("coins").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.coins ?? 0;
}

export async function getNotes(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Note[];
}

export async function getDecksWithCounts(supabase: SupabaseClient, userId: string) {
  const { data: decks, error } = await supabase
    .from("decks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const results = [];
  for (const deck of decks as Deck[]) {
    const { data: cardIdsData } = await supabase
      .from("cards")
      .select("id")
      .eq("deck_id", deck.id);
    const cardIds = (cardIdsData ?? []).map((c) => c.id);

    let dueCount = 0;
    if (cardIds.length > 0) {
      const { data: progressRows } = await supabase
        .from("card_progress")
        .select("card_id, due_at")
        .eq("user_id", userId)
        .in("card_id", cardIds);

      const progressByCard = new Map((progressRows ?? []).map((p) => [p.card_id, p.due_at]));
      const now = Date.now();
      for (const id of cardIds) {
        const dueAt = progressByCard.get(id);
        // Cards never studied (no progress row) are due immediately, same as
        // cards whose scheduled review date has passed.
        if (!dueAt || new Date(dueAt).getTime() <= now) dueCount++;
      }
    }

    results.push({ deck, cardCount: cardIds.length, dueCount });
  }

  return results;
}

export async function getDeckWithCards(supabase: SupabaseClient, deckId: string) {
  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .single();
  if (deckError) return null;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });
  if (cardsError) throw new Error(cardsError.message);

  return { deck: deck as Deck, cards: (cards ?? []) as Card[] };
}

/** Combines cards from multiple decks (e.g. for a cross-deck exam) — only decks the user owns are included. */
export async function getDecksWithCardsByIds(
  supabase: SupabaseClient,
  deckIds: string[],
  userId: string,
) {
  if (deckIds.length === 0) return { decks: [] as Deck[], cards: [] as Card[] };

  const { data: decks, error: decksError } = await supabase
    .from("decks")
    .select("*")
    .in("id", deckIds)
    .eq("user_id", userId);
  if (decksError) throw new Error(decksError.message);

  const ownedIds = (decks as Deck[]).map((d) => d.id);
  if (ownedIds.length === 0) return { decks: [] as Deck[], cards: [] as Card[] };

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .in("deck_id", ownedIds)
    .order("created_at", { ascending: true });
  if (cardsError) throw new Error(cardsError.message);

  return { decks: decks as Deck[], cards: (cards ?? []) as Card[] };
}

/**
 * Maps each Hanzi word already saved in one of the user's decks to the
 * titles of the decks that contain it — used to flag repeats (e.g. 你/吗/我)
 * that keep reappearing across different slide sets when importing a new one.
 */
export async function getExistingWordDecks(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, string[]>> {
  const { data: decks, error: decksError } = await supabase
    .from("decks")
    .select("id, title")
    .eq("user_id", userId);
  if (decksError) throw new Error(decksError.message);
  if (!decks || decks.length === 0) return new Map();

  const deckTitleById = new Map((decks as { id: string; title: string }[]).map((d) => [d.id, d.title]));

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("hanzi, deck_id")
    .in("deck_id", decks.map((d) => d.id));
  if (cardsError) throw new Error(cardsError.message);

  const result = new Map<string, string[]>();
  for (const card of (cards ?? []) as { hanzi: string; deck_id: string }[]) {
    const title = deckTitleById.get(card.deck_id);
    if (!title) continue;
    const titles = result.get(card.hanzi) ?? [];
    if (!titles.includes(title)) titles.push(title);
    result.set(card.hanzi, titles);
  }
  return result;
}

/**
 * Home-page highlights: the newest deck, the deck the user has been doing
 * worst on (lowest average SM-2 ease among decks with review history), and
 * the folder containing their most recently studied deck.
 */
export async function getHomeHighlights(
  supabase: SupabaseClient,
  userId: string,
  decks: { deck: Deck; cardCount: number }[],
  folders: Folder[],
) {
  if (decks.length === 0) {
    return { newestDeck: null, weakestDeck: null, recentFolder: null };
  }

  const deckById = new Map(decks.map((d) => [d.deck.id, d.deck]));
  const cardCountByDeck = new Map(decks.map((d) => [d.deck.id, d.cardCount]));

  const { data: cardRows, error: cardsError } = await supabase
    .from("cards")
    .select("id, deck_id")
    .in("deck_id", decks.map((d) => d.deck.id));
  if (cardsError) throw new Error(cardsError.message);

  const deckIdByCard = new Map((cardRows ?? []).map((c) => [c.id as string, c.deck_id as string]));
  const cardIds = (cardRows ?? []).map((c) => c.id as string);

  const { data: progressRows, error: progressError } =
    cardIds.length > 0
      ? await supabase
          .from("card_progress")
          .select("card_id, ease, last_reviewed_at")
          .eq("user_id", userId)
          .in("card_id", cardIds)
      : { data: [] as { card_id: string; ease: number; last_reviewed_at: string | null }[], error: null };
  if (progressError) throw new Error(progressError.message);

  const reviewed = (progressRows ?? []).filter((r) => r.last_reviewed_at);

  // decks are pre-sorted newest first (see getDecksWithCounts)
  const newestDeck = { deck: decks[0].deck, cardCount: decks[0].cardCount };

  const easeSumByDeck = new Map<string, number>();
  const easeCountByDeck = new Map<string, number>();
  for (const row of reviewed) {
    const deckId = deckIdByCard.get(row.card_id);
    if (!deckId) continue;
    easeSumByDeck.set(deckId, (easeSumByDeck.get(deckId) ?? 0) + row.ease);
    easeCountByDeck.set(deckId, (easeCountByDeck.get(deckId) ?? 0) + 1);
  }

  let weakestDeckId: string | null = null;
  let weakestAvgEase = Infinity;
  for (const [deckId, sum] of easeSumByDeck) {
    const avg = sum / (easeCountByDeck.get(deckId) ?? 1);
    if (avg < weakestAvgEase) {
      weakestAvgEase = avg;
      weakestDeckId = deckId;
    }
  }
  const weakestDeck =
    weakestDeckId && deckById.has(weakestDeckId)
      ? { deck: deckById.get(weakestDeckId)!, cardCount: cardCountByDeck.get(weakestDeckId) ?? 0 }
      : null;

  const reviewedSorted = [...reviewed].sort(
    (a, b) => new Date(b.last_reviewed_at!).getTime() - new Date(a.last_reviewed_at!).getTime(),
  );
  let recentFolder: { folder: Folder; deckCount: number } | null = null;
  for (const row of reviewedSorted) {
    const deckId = deckIdByCard.get(row.card_id);
    const deck = deckId ? deckById.get(deckId) : null;
    if (!deck?.folder_id) continue;
    const folder = folders.find((f) => f.id === deck.folder_id);
    if (!folder) continue;
    recentFolder = { folder, deckCount: decks.filter((d) => d.deck.folder_id === folder.id).length };
    break;
  }

  return { newestDeck, weakestDeck, recentFolder };
}

export async function getProgressForCards(
  supabase: SupabaseClient,
  userId: string,
  cardIds: string[],
) {
  if (cardIds.length === 0) return new Map<string, CardProgress>();
  const { data, error } = await supabase
    .from("card_progress")
    .select("*")
    .eq("user_id", userId)
    .in("card_id", cardIds);
  if (error) throw new Error(error.message);

  return new Map((data as CardProgress[]).map((p) => [p.card_id, p]));
}
