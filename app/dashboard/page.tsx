import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCounts } from "@/lib/queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decks = await getDecksWithCounts(supabase, user.id);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your decks</h1>
        <div className="flex gap-3">
          <Link
            href="/exam/new"
            className="rounded-md border px-4 py-2 text-sm"
            style={{
              background: "transparent",
              color: "var(--accent-btn-text)",
              borderColor: "var(--accent-btn-border)",
            }}
          >
            Generate exam
          </Link>
          <Link
            href="/decks/new"
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{
              background: "var(--accent-btn-solid-bg)",
              color: "var(--accent-btn-solid-text)",
            }}
          >
            + Import slides
          </Link>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/15 p-10 text-center text-zinc-500 dark:border-white/15">
          <p>No decks yet.</p>
          <p className="mt-1 text-sm">
            Upload a slide deck, PDF, or photo to generate your first flashcards.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {decks.map(({ deck, cardCount, dueCount }) => (
            <li
              key={deck.id}
              className="relative flex items-center justify-between rounded-lg border border-black/10 bg-card p-4 transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20"
            >
              <Link
                href={`/decks/${deck.id}`}
                className="absolute inset-0 rounded-lg"
                aria-label={`Open ${deck.title}`}
              />
              <div>
                <span className="font-medium">{deck.title}</span>
                <p className="text-sm text-zinc-500">{cardCount} cards</p>
              </div>
              <div className="flex items-center gap-3">
                {dueCount > 0 && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {dueCount} due
                  </span>
                )}
                <Link
                  href={`/decks/${deck.id}/study`}
                  className="relative z-10 rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
                >
                  Study
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
