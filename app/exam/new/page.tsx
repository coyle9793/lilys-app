import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCounts } from "@/lib/queries";
import DeckPicker from "@/components/exam/DeckPicker";

export default async function NewExamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decks = await getDecksWithCounts(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Generate an exam</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Choose one or more decks to pull vocabulary from — cards from every deck you
        select are combined into a single exam.
      </p>

      {decks.length === 0 ? (
        <p className="text-zinc-500">
          You don&apos;t have any decks yet — import some slides first.
        </p>
      ) : (
        <DeckPicker
          decks={decks.map(({ deck, cardCount }) => ({
            id: deck.id,
            title: deck.title,
            cardCount,
          }))}
        />
      )}
    </div>
  );
}
