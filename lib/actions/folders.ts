"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createFolder(name: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("folders").insert({ user_id: user.id, name });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function renameFolder(folderId: string, name: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("folders").update({ name }).eq("id", folderId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

/** Deletes the folder only — decks inside it fall back to "No folder" rather than being deleted. */
export async function deleteFolder(folderId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("folders").delete().eq("id", folderId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
