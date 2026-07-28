import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { filterDueCards, getDeckWithCards, getProgressForCards } from "@/lib/queries";
import StudySession from "@/components/study/StudySession";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getDeckWithCards(supabase, deckId);
  if (!result) notFound();
  const { deck, cards } = result;

  const progress = await getProgressForCards(
    supabase,
    user.id,
    cards.map((c) => c.id),
  );

  const dueCards = filterDueCards(cards, progress);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Study: {deck.title}</h1>
      {cards.length === 0 ? (
        <p className="text-zinc-500">This deck has no cards yet.</p>
      ) : (
        <StudySession deckId={deck.id} allCards={cards} dueCards={dueCards} />
      )}
    </div>
  );
}
