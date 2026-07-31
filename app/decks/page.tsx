import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCounts, getFolders } from "@/lib/queries";
import DeckFolders from "@/components/DeckFolders";
import HomeNav from "@/components/HomeNav";

export default async function DecksPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const decks = await getDecksWithCounts(supabase, user.id);
  // Falls back to no folders (rather than a broken page) for accounts
  // that haven't run the folders migration (supabase/migrations/0001_add_folders.sql) yet.
  const folders = await getFolders(supabase, user.id).catch(() => []);

  return (
    <div className="w-full max-w-5xl px-6 py-10">
      <HomeNav active="decks" />
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your decks</h1>
        <div className="flex gap-3">
          <Link href="/exam/new" className="rounded-md border px-4 py-2 text-sm" style={{ background: "transparent", color: "var(--accent-btn-text)", borderColor: "var(--accent-btn-border)" }}>
            Generate exam
          </Link>
          <Link href="/decks/new" className="rounded-md px-4 py-2 text-sm font-medium" style={{ background: "var(--accent-btn-solid-bg)", color: "var(--accent-btn-solid-text)" }}>
            + Import slides
          </Link>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-black/15 p-10 text-center text-zinc-500 dark:border-white/15">
          <p>No decks yet.</p>
          <p className="mt-1 text-sm">Upload a slide deck, PDF, or photo to generate your first flashcards.</p>
        </div>
      ) : (
        <DeckFolders folders={folders} decks={decks} initialFolderId={folder} />
      )}
    </div>
  );
}
