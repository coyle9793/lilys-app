import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeckWithCards } from "@/lib/queries";
import DeckHeader from "@/components/DeckHeader";
import CardList from "@/components/CardList";

export default async function DeckPage({
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
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <DeckHeader deckId={deck.id} title={deck.title} />

      <div className="mb-6 flex gap-3">
        <Link
          href={`/decks/${deck.id}/study`}
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
        >
          Study this deck
        </Link>
      </div>

      {cards.length === 0 ? (
        <p className="text-zinc-500">No cards yet — add one below.</p>
      ) : null}

      <CardList deckId={deck.id} cards={cards} />
    </div>
  );
}
