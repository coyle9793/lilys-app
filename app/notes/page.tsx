import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCounts, getNotes } from "@/lib/queries";
import HomeNav from "@/components/HomeNav";
import NotesView from "@/components/NotesView";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string }>;
}) {
  const { note } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [notes, decks] = await Promise.all([
    getNotes(supabase, user.id).catch(() => []),
    getDecksWithCounts(supabase, user.id),
  ]);

  const deckTitleById = new Map(decks.map(({ deck }) => [deck.id, deck.title]));

  return (
    <div className="w-full max-w-5xl px-6 py-10">
      <HomeNav active="notes" />
      <h1 className="mb-8 text-2xl font-semibold">Your notes</h1>
      <NotesView notes={notes} deckTitleById={deckTitleById} initialNoteId={note} />
    </div>
  );
}
