"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { NewCardInput } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createDeck(title: string, cards: NewCardInput[], notesContent?: string) {
  const { supabase, user } = await requireUser();

  const { data: deck, error: deckError } = await supabase
    .from("decks")
    .insert({ user_id: user.id, title })
    .select()
    .single();

  if (deckError) throw new Error(deckError.message);

  if (cards.length > 0) {
    const { error: cardsError } = await supabase.from("cards").insert(
      cards.map((c) => ({
        deck_id: deck.id,
        hanzi: c.hanzi,
        pinyin: c.pinyin,
        definition: c.definition,
        note: c.note ?? "",
      })),
    );
    if (cardsError) throw new Error(cardsError.message);
  }

  if (notesContent?.trim()) {
    const { error: notesError } = await supabase
      .from("notes")
      .insert({ user_id: user.id, deck_id: deck.id, title, content: notesContent.trim() });
    if (notesError) throw new Error(notesError.message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/decks");
  revalidatePath("/notes");
  redirect(`/decks/${deck.id}`);
}

export async function renameDeck(deckId: string, title: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("decks").update({ title }).eq("id", deckId);
  if (error) throw new Error(error.message);
  revalidatePath(`/decks/${deckId}`);
  revalidatePath("/dashboard");
  revalidatePath("/decks");
}

export async function moveDeckToFolder(deckId: string, folderId: string | null) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("decks").update({ folder_id: folderId }).eq("id", deckId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/decks");
}

export async function deleteDeck(deckId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("decks").delete().eq("id", deckId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/decks");
  redirect("/decks");
}

export async function addCard(deckId: string, card: NewCardInput) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cards").insert({
    deck_id: deckId,
    hanzi: card.hanzi,
    pinyin: card.pinyin,
    definition: card.definition,
    note: card.note ?? "",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/decks/${deckId}`);
}

export async function updateCard(
  deckId: string,
  cardId: string,
  card: NewCardInput,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("cards")
    .update({
      hanzi: card.hanzi,
      pinyin: card.pinyin,
      definition: card.definition,
      note: card.note ?? "",
    })
    .eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath(`/decks/${deckId}`);
}

export async function deleteCard(deckId: string, cardId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
  revalidatePath(`/decks/${deckId}`);
}
