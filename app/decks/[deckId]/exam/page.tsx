import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeckWithCards } from "@/lib/queries";
import { hasGeminiKey } from "@/lib/ai/gemini";
import ExamClient from "@/components/exam/ExamClient";

export default async function ExamPage({
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

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Exam: {deck.title}</h1>
      {cards.length === 0 ? (
        <p className="text-zinc-500">This deck has no cards yet.</p>
      ) : !hasGeminiKey() ? (
        <p className="text-zinc-500">
          Generating exam questions needs a free Gemini API key configured on the
          server (see the README&apos;s &quot;accurate character guessing&quot; section for
          setup — the same key powers this).
        </p>
      ) : (
        <ExamClient
          deckIds={[deck.id]}
          cardCount={cards.length}
          backHref={`/decks/${deck.id}`}
          backLabel="Back to deck"
        />
      )}
    </div>
  );
}
