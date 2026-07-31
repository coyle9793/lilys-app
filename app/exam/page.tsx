import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCardsByIds } from "@/lib/queries";
import { hasGeminiKey } from "@/lib/ai/gemini";
import ExamClient from "@/components/exam/ExamClient";

export default async function ExamPage({
  searchParams,
}: {
  searchParams: Promise<{ decks?: string }>;
}) {
  const { decks: decksParam } = await searchParams;
  const deckIds = (decksParam ?? "").split(",").filter(Boolean);
  if (deckIds.length === 0) redirect("/exam/new");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { decks, cards } = await getDecksWithCardsByIds(supabase, deckIds, user.id);
  if (decks.length === 0) redirect("/exam/new");

  const title = decks.length <= 2 ? decks.map((d) => d.title).join(" + ") : `${decks.length} decks`;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Exam: {title}</h1>
        <Link href="/exam/new" className="text-sm text-zinc-500 hover:underline">
          Change decks
        </Link>
      </div>
      {cards.length === 0 ? (
        <p className="text-zinc-500">The selected deck(s) have no cards yet.</p>
      ) : !hasGeminiKey() ? (
        <p className="text-zinc-500">
          Generating exam questions needs a free Gemini API key configured on the
          server (see the README&apos;s &quot;accurate character guessing&quot; section for
          setup — the same key powers this).
        </p>
      ) : (
        <ExamClient deckIds={decks.map((d) => d.id)} cardCount={cards.length} />
      )}
    </div>
  );
}
