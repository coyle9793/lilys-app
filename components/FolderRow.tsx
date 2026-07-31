"use client";

import { useState } from "react";
import Link from "next/link";
import { renameFolder, deleteFolder } from "@/lib/actions/folders";
import { FolderIcon } from "@/components/icons";
import type { Folder } from "@/lib/types";

/**
 * A single boxed folder entry with its own rename/delete controls — used both
 * in the dashboard sidebar (click switches the view in place) and on the
 * "all folders" page (click navigates to the dashboard filtered to it).
 */
export function FolderRow({
  folder,
  count,
  active = false,
  href,
  onClick,
}: {
  folder: Folder;
  count: number;
  active?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [value, setValue] = useState(folder.name);

  function startRename() {
    setValue(folder.name);
    setRenaming(true);
  }

  async function commitRename() {
    const name = value.trim();
    setRenaming(false);
    if (!name || name === folder.name) return;
    await renameFolder(folder.id, name);
  }

  async function handleDelete() {
    if (
      !confirm(`Delete "${folder.name}"? Decks inside it move back to "No folder" — they won't be deleted.`)
    ) {
      return;
    }
    await deleteFolder(folder.id);
  }

  if (renaming) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commitRename()}
        onBlur={commitRename}
        className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15"
      />
    );
  }

  const labelClass = `flex min-w-0 flex-1 items-center justify-between px-1 py-1.5 text-left text-sm ${
    active ? "font-medium" : "text-zinc-600 dark:text-zinc-400"
  }`;
  const labelStyle = active ? { color: "var(--accent-btn-text)" } : undefined;

  return (
    <div
      className={`flex items-center gap-0.5 rounded-md border px-1 ${
        active ? "" : "border-black/10 dark:border-white/10"
      }`}
      style={active ? { background: "var(--accent-btn-bg)", borderColor: "var(--accent-btn-border)" } : undefined}
    >
      {href ? (
        <Link href={href} className={labelClass} style={labelStyle}>
          <span className="flex min-w-0 items-center gap-1.5">
            <FolderIcon className="shrink-0 text-zinc-400" />
            <span className="truncate">{folder.name}</span>
          </span>
          <span className="ml-2 shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            {count}
          </span>
        </Link>
      ) : (
        <button onClick={onClick} className={labelClass} style={labelStyle}>
          <span className="flex min-w-0 items-center gap-1.5">
            <FolderIcon className="shrink-0 text-zinc-400" />
            <span className="truncate">{folder.name}</span>
          </span>
          <span className="ml-2 shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            {count}
          </span>
        </button>
      )}
      <button
        onClick={startRename}
        aria-label={`Rename ${folder.name}`}
        className="shrink-0 px-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        ✎
      </button>
      <button
        onClick={handleDelete}
        aria-label={`Delete ${folder.name}`}
        className="shrink-0 px-1 text-xs text-zinc-400 hover:text-red-500"
      >
        ×
      </button>
    </div>
  );
}
