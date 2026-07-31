import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCounts, getFolders } from "@/lib/queries";
import { FolderRow } from "@/components/FolderRow";
import HomeNav from "@/components/HomeNav";

export default async function FoldersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [decks, folders] = await Promise.all([
    getDecksWithCounts(supabase, user.id),
    getFolders(supabase, user.id).catch(() => []),
  ]);

  const deckCountByFolder = new Map<string, number>();
  for (const { deck } of decks) {
    if (deck.folder_id) deckCountByFolder.set(deck.folder_id, (deckCountByFolder.get(deck.folder_id) ?? 0) + 1);
  }

  return (
    <div className="w-full max-w-2xl px-6 py-10">
      <HomeNav active="folders" />
      <h1 className="mb-6 text-2xl font-semibold">All folders</h1>

      {folders.length === 0 ? (
        <p className="text-sm text-zinc-500">You don&apos;t have any folders yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              count={deckCountByFolder.get(folder.id) ?? 0}
              href={`/decks?folder=${folder.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
