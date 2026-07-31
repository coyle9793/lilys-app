"use client";

import { useState } from "react";
import Link from "next/link";
import { createFolder } from "@/lib/actions/folders";
import { moveDeckToFolder } from "@/lib/actions/decks";
import { FolderRow } from "@/components/FolderRow";
import type { Deck, Folder } from "@/lib/types";

interface DeckRow {
  deck: Deck;
  cardCount: number;
  dueCount: number;
}

const ALL = "all";
const UNFILED = "unfiled";
const FOLDER_PREFIX = "folder:";
const SIDEBAR_FOLDER_LIMIT = 5;

export default function DeckFolders({
  folders,
  decks,
  initialFolderId,
}: {
  folders: Folder[];
  decks: DeckRow[];
  initialFolderId?: string;
}) {
  const [rawView, setView] = useState<string>(initialFolderId ? FOLDER_PREFIX + initialFolderId : ALL);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  // If the currently selected folder gets deleted (from here or the "all
  // folders" page), fall back to "All decks" instead of showing an empty
  // "Folder" view with no way back to it in the sidebar.
  const view =
    rawView.startsWith(FOLDER_PREFIX) && !folders.some((f) => FOLDER_PREFIX + f.id === rawView) ? ALL : rawView;

  const byFolder = new Map<string, DeckRow[]>();
  const unfiled: DeckRow[] = [];
  for (const row of decks) {
    if (row.deck.folder_id) {
      const list = byFolder.get(row.deck.folder_id) ?? [];
      list.push(row);
      byFolder.set(row.deck.folder_id, list);
    } else {
      unfiled.push(row);
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createFolder(name);
      setNewFolderName("");
      setAddingFolder(false);
    } finally {
      setCreating(false);
    }
  }

  let visibleRows: DeckRow[];
  let heading: string;
  if (view === ALL) {
    visibleRows = decks;
    heading = "All decks";
  } else if (view === UNFILED) {
    visibleRows = unfiled;
    heading = "No folder";
  } else {
    const folderId = view.slice(FOLDER_PREFIX.length);
    visibleRows = byFolder.get(folderId) ?? [];
    heading = folders.find((f) => f.id === folderId)?.name ?? "Folder";
  }

  const sidebarFolders = folders.slice(0, SIDEBAR_FOLDER_LIMIT);
  const hasMoreFolders = folders.length > SIDEBAR_FOLDER_LIMIT;

  return (
    <div className="flex gap-8">
      <nav className="flex w-48 shrink-0 flex-col gap-1.5 rounded-xl border border-black/10 bg-card p-3 dark:border-white/10">
        <SidebarRow active={view === ALL}>
          <SidebarLabel label="All decks" count={decks.length} active={view === ALL} onClick={() => setView(ALL)} />
        </SidebarRow>
        <SidebarRow active={view === UNFILED}>
          <SidebarLabel
            label="No folder"
            count={unfiled.length}
            active={view === UNFILED}
            onClick={() => setView(UNFILED)}
          />
        </SidebarRow>

        <div className="mb-1 mt-3 text-xs font-medium uppercase tracking-wide text-zinc-400">Folders</div>

        {sidebarFolders.map((folder) => {
          const key = FOLDER_PREFIX + folder.id;
          return (
            <FolderRow
              key={folder.id}
              folder={folder}
              count={byFolder.get(folder.id)?.length ?? 0}
              active={view === key}
              onClick={() => setView(key)}
            />
          );
        })}

        {hasMoreFolders && (
          <Link href="/folders" className="px-1 py-0.5 text-xs text-zinc-500 hover:underline dark:text-zinc-400">
            More folders ({folders.length - SIDEBAR_FOLDER_LIMIT} more) →
          </Link>
        )}

        {addingFolder ? (
          <div className="mt-2 flex flex-col gap-1.5">
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              placeholder="Folder name…"
              className="rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15"
            />
            <div className="flex gap-3 text-xs">
              <button
                onClick={handleCreateFolder}
                disabled={creating || !newFolderName.trim()}
                className="text-zinc-700 hover:underline disabled:opacity-50 dark:text-zinc-300"
              >
                {creating ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setAddingFolder(false);
                  setNewFolderName("");
                }}
                className="text-zinc-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingFolder(true)}
            className="mt-2 rounded-md border border-dashed border-black/20 px-2 py-1.5 text-left text-sm text-zinc-500 dark:border-white/20"
          >
            + New folder
          </button>
        )}
      </nav>

      <div className="min-w-0 flex-1">
        <h2 className="mb-3 text-sm font-medium text-zinc-500">{heading}</h2>
        {visibleRows.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {view === UNFILED ? "Everything's filed away." : "Nothing here yet."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleRows.map((row) => (
              <DeckRowItem key={row.deck.id} row={row} folders={folders} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** The bordered box that gives "All decks" / "No folder" their own visible separation. */
function SidebarRow({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-0.5 rounded-md border px-1 ${
        active ? "" : "border-black/10 dark:border-white/10"
      }`}
      style={active ? { background: "var(--accent-btn-bg)", borderColor: "var(--accent-btn-border)" } : undefined}
    >
      {children}
    </div>
  );
}

function SidebarLabel({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex min-w-0 flex-1 items-center justify-between px-1 py-1.5 text-left text-sm ${
        active ? "font-medium" : "text-zinc-600 dark:text-zinc-400"
      }`}
      style={active ? { color: "var(--accent-btn-text)" } : undefined}
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 shrink-0 text-xs text-zinc-400">{count}</span>
    </button>
  );
}

function DeckRowItem({ row, folders }: { row: DeckRow; folders: Folder[] }) {
  const { deck, cardCount, dueCount } = row;
  return (
    <li className="relative flex items-center justify-between rounded-lg border border-black/10 bg-card p-4 transition-colors hover:border-black/20 dark:border-white/10 dark:hover:border-white/20">
      <Link href={`/decks/${deck.id}`} className="absolute inset-0 rounded-lg" aria-label={`Open ${deck.title}`} />
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
        <select
          value={deck.folder_id ?? ""}
          onChange={(e) => moveDeckToFolder(deck.id, e.target.value || null)}
          aria-label={`Move ${deck.title} to folder`}
          className="relative z-10 rounded-md border border-black/15 bg-transparent px-2 py-1.5 text-xs dark:border-white/15"
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <Link
          href={`/decks/${deck.id}/study`}
          className="relative z-10 rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
        >
          Study
        </Link>
      </div>
    </li>
  );
}
