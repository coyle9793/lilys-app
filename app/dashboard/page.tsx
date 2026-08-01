import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBadgeStats, getDecksWithCounts, getFolders, getHomeHighlights } from "@/lib/queries";
import HomeNav from "@/components/HomeNav";
import BadgesGrid from "@/components/BadgesGrid";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decks = await getDecksWithCounts(supabase, user.id);
  // Falls back to no folders (rather than a broken page) for accounts
  // that haven't run the folders migration (supabase/migrations/0001_add_folders.sql) yet.
  const folders = await getFolders(supabase, user.id).catch(() => []);
  const { newestDeck, weakestDeck, recentFolder } = await getHomeHighlights(supabase, user.id, decks, folders);
  // Falls back to all-zero stats (rather than a broken page) for accounts
  // that haven't run the streaks migration (supabase/migrations/0005_add_streaks.sql) yet.
  const badgeStats = await getBadgeStats(supabase, user.id).catch(() => ({
    deckCount: decks.length,
    folderCount: folders.length,
    noteCount: 0,
    reviewedCardCount: 0,
    coins: 0,
    longestStreak: 0,
  }));

  return (
    <div className="w-full max-w-7xl px-6 py-10">
      <HomeNav active="home" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl flex-1">
          {decks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-black/15 p-10 text-center text-zinc-500 dark:border-white/15">
              <p>No decks yet.</p>
              <p className="mt-1 text-sm">Upload a slide deck, PDF, or photo to generate your first flashcards.</p>
              <Link
                href="/decks/new"
                className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium"
                style={{ background: "var(--accent-btn-solid-bg)", color: "var(--accent-btn-solid-text)" }}
              >
                + Import slides
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {weakestDeck ? (
                <HeroCard
                  kicker="Needs practice"
                  title={weakestDeck.deck.title}
                  sub="This deck has been trickier in your recent study sessions — worth another pass."
                  buttonLabel="Retry now"
                  href={`/decks/${weakestDeck.deck.id}/study`}
                />
              ) : (
                newestDeck && (
                  <HeroCard
                    kicker="Start here"
                    title={newestDeck.deck.title}
                    sub="You haven't studied yet — start with your newest deck."
                    buttonLabel="Study now"
                    href={`/decks/${newestDeck.deck.id}/study`}
                  />
                )
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                {newestDeck && (
                  <Tile
                    kicker="Newest deck"
                    title={newestDeck.deck.title}
                    sub={`${newestDeck.cardCount} card${newestDeck.cardCount === 1 ? "" : "s"}`}
                    buttonLabel="Study"
                    href={`/decks/${newestDeck.deck.id}/study`}
                  />
                )}
                {recentFolder ? (
                  <Tile
                    kicker="Recent folder"
                    title={recentFolder.folder.name}
                    sub={`${recentFolder.deckCount} deck${recentFolder.deckCount === 1 ? "" : "s"}`}
                    buttonLabel="Open folder"
                    href={`/decks?folder=${recentFolder.folder.id}`}
                  />
                ) : (
                  <Tile
                    kicker="Folders"
                    title="No folder activity yet"
                    sub="Study a deck inside a folder to see it here."
                    buttonLabel="Browse folders"
                    href="/folders"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <BadgesGrid stats={badgeStats} />
      </div>
    </div>
  );
}

function HeroCard({
  kicker,
  title,
  sub,
  buttonLabel,
  href,
}: {
  kicker: string;
  title: string;
  sub: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-2xl border p-6" style={{ background: "var(--accent-btn-bg)", borderColor: "var(--accent-btn-border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-btn-text)" }}>
        {kicker}
      </p>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{sub}</p>
      <Link
        href={href}
        className="mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium"
        style={{ background: "var(--accent-btn-solid-bg)", color: "var(--accent-btn-solid-text)" }}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}

function Tile({
  kicker,
  title,
  sub,
  buttonLabel,
  href,
}: {
  kicker: string;
  title: string;
  sub: string;
  buttonLabel: string;
  href: string;
}) {
  return (
    <div className="rounded-xl border border-black/10 bg-card p-5 dark:border-white/10">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{kicker}</p>
      <h3 className="mt-1 font-medium">{title}</h3>
      <p className="mt-1 text-sm text-zinc-500">{sub}</p>
      <Link
        href={href}
        className="mt-3 inline-block rounded-md border px-3 py-1.5 text-sm"
        style={{ color: "var(--accent-btn-text)", borderColor: "var(--accent-btn-border)" }}
      >
        {buttonLabel}
      </Link>
    </div>
  );
}
