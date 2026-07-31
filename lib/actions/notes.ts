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

export async function createNote(title: string, content: string = "", deckId: string | null = null) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("notes")
    .insert({ user_id: user.id, deck_id: deckId, title, content })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  revalidatePath("/dashboard");
  return data.id as string;
}

export async function updateNote(noteId: string, title: string, content: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("notes")
    .update({ title, content, updated_at: new Date().toISOString() })
    .eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}

export async function deleteNote(noteId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
  revalidatePath("/dashboard");
}
