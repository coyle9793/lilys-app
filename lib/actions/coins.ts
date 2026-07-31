"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MIN_CARDS_FOR_COINS = 10;

/** Awards 1 coin per card for a completed study session of more than 10 cards. */
export async function awardCoinsForSession(cardCount: number) {
  if (cardCount <= MIN_CARDS_FOR_COINS) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase.from("profiles").select("coins").eq("id", user.id).maybeSingle();
  const newTotal = (existing?.coins ?? 0) + cardCount;

  const { error } = await supabase.from("profiles").upsert({ id: user.id, coins: newTotal });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
