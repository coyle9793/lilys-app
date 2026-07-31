import type { SupabaseClient } from "@supabase/supabase-js";
import type { Card, CardProgress, Deck, Folder } from "@/lib/types";

/** Cards due for review: never studied, or whose scheduled due date has passed. */
export function filterDueCards(cards: Card[], progress: Map<string, CardProgress>): Card[] {
  const now = Date.now();
  return cards.filter((c) => {
    const p = progress.get(c.id);
    return !p || new Date(p.due_at).getTime() <= now;
  });
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
