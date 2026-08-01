"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / msPerDay);
}

/**
 * Marks `today` (the caller's local date, as "YYYY-MM-DD") as a study day and
 * updates the streak — call once per completed study session or exam,
 * regardless of size or score, so any real study activity counts.
 */
export async function recordStudyActivity(today: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_active_date")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.last_active_date === today) return;

  const currentStreak =
    existing?.last_active_date && daysBetween(existing.last_active_date, today) === 1
      ? (existing.current_streak ?? 0) + 1
      : 1;
  const longestStreak = Math.max(existing?.longest_streak ?? 0, currentStreak);

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, current_streak: currentStreak, longest_streak: longestStreak, last_active_date: today });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
