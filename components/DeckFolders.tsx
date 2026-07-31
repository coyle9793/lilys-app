"use client";

import { useState } from "react";
import Link from "next/link";
import { createFolder, renameFolder, deleteFolder } from "@/lib/actions/folders";
import { moveDeckToFolder } from "@/lib/actions/decks";
import type { Deck, Folder } from "@/lib/types";

interface DeckRow {
  deck: Deck;
  cardCount: number;
  dueCount: number;
}

export default function DeckFolders({ folders, decks }: { folders: Folder[]; decks: DeckRow[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createFolder(name);
      setNewFolderName("");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(folderId: string) {
    const name = renameValue.trim();
    setRenamingId(null);
    if (!name) return;
    await renameFolder(folderId, name);
  }

  async function handleDelete(folderId: string, folderName: string) {
    if (
      !confirm(`Delete "${folderName}"? Decks inside it move back to "No folder" — they won't be deleted.`)
    ) {
      return;
    }
    await deleteFolder(folderId);
  }

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <input
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          placeholder="New folder name…"
          className="w-full max-w-xs rounded-md border border-black/15 px-3 py-1.5 text-sm dark:border-white/15"
        />
        <button
          onClick={handleCreateFolder}
          disabled={creating || !newFolderName.trim()}
          className="rounded-md border border-black/15 px-3 py-1.5 text-sm disabled:opacity-50 dark:border-white/15"
        >
          + New folder
        </button>
      </div>

      {folders.map((folder) => {
        const rows = byFolder.get(folder.id) ?? [];
        const isCollapsed = collapsed.has(folder.id);
        const isRenaming = renamingId === folder.id;
        return (
          <div key={folder.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(folder.id)}
                  onBlur={() => handleRename(folder.id)}
                  className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15"
                />
              ) : (
                <button
                  onClick={() => toggle(folder.id)}
                  className="flex items-center gap-1.5 text-left font-medium"
                >
                  <span className={`inline-block text-xs transition-transform ${isCollapsed ? "-rotate-90" : ""}`}>
                    ▾
                  </span>
                  {folder.name}
                  <span className="text-sm font-normal text-zinc-500">({rows.length})</span>
                </button>
              )}
              <div className="ml-auto flex gap-3 text-xs text-zinc-500">
                <button
                  onClick={() => {
                    setRenamingId(folder.id);
                    setRenameValue(folder.name);
                  }}
                  className="hover:underline"
                >
                  Rename
                </button>
                <button onClick={() => handleDelete(folder.id, folder.name)} className="hover:underline">
                  Delete
                </button>
              </div>
            </div>

            {!isCollapsed &&
              (rows.length === 0 ? (
                <p className="pl-5 text-sm text-zinc-400">No decks here yet — move one in below.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {rows.map((row) => (
                    <DeckRowItem key={row.deck.id} row={row} folders={folders} />
                  ))}
                </ul>
              ))}
          </div>
        );
      })}

      <div className="flex flex-col gap-2">
        {folders.length > 0 && <h2 className="text-sm font-medium text-zinc-500">No folder</h2>}
        {unfiled.length === 0 ? (
          folders.length > 0 && <p className="text-sm text-zinc-400">Everything&apos;s filed away.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {unfiled.map((row) => (
              <DeckRowItem key={row.deck.id} row={row} folders={folders} />
            ))}
          </ul>
        )}
      </div>
    </div>
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
