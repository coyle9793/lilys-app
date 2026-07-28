"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { schedule, type Grade } from "@/lib/srs/sm2";

export async function recordReview(deckId: string, cardId: string, grade: Grade) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("card_progress")
    .select("ease, interval_days")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  const current = existing
    ? { ease: existing.ease, intervalDays: existing.interval_days }
    : { ease: 2.5, intervalDays: 0 };

  const next = schedule(current, grade);

  const { error } = await supabase.from("card_progress").upsert(
    {
      card_id: cardId,
      user_id: user.id,
      ease: next.ease,
      interval_days: next.intervalDays,
      due_at: next.dueAt.toISOString(),
      last_reviewed_at: new Date().toISOString(),
    },
    { onConflict: "card_id,user_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath(`/decks/${deckId}/study`);
  revalidatePath("/dashboard");
}
