"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MIN_CARDS_FOR_COINS = 10;

/**
 * Awards 1 coin per correctly-answered card for a completed study session of
 * more than 10 cards — cards gotten wrong earn nothing.
 */
export async function awardCoinsForSession(totalCards: number, correctCount: number) {
  if (totalCards <= MIN_CARDS_FOR_COINS || correctCount <= 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase.from("profiles").select("coins").eq("id", user.id).maybeSingle();
  const newTotal = (existing?.coins ?? 0) + correctCount;

  const { error } = await supabase.from("profiles").upsert({ id: user.id, coins: newTotal });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
