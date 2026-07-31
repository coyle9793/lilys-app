"use client";

import { useState } from "react";
import Link from "next/link";
import { renameFolder, deleteFolder } from "@/lib/actions/folders";
import { FolderIcon } from "@/components/icons";
import type { Folder } from "@/lib/types";

/**
 * A single folder entry with its own rename/delete controls — used both in
 * the dashboard sidebar (compact, click switches the view in place) and on
 * the "all folders" page (spacious, click navigates to it).
 */
export function FolderRow({
  folder,
  count,
  active = false,
  href,
  onClick,
  variant = "compact",
}: {
  folder: Folder;
  count: number;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  variant?: "compact" | "spacious";
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

  const spacious = variant === "spacious";

  const labelClass = `flex min-w-0 flex-1 items-center gap-3 text-left ${
    spacious ? "px-4 py-3.5" : "px-1 py-1.5 text-sm"
  } ${active ? "font-medium" : "text-zinc-600 dark:text-zinc-400"}`;
  const labelStyle = active ? { color: "var(--accent-btn-text)" } : undefined;

  const iconEl = spacious ? (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
      style={{ background: "var(--accent-btn-bg)", color: "var(--accent-btn-text)" }}
    >
      <FolderIcon width={18} height={18} />
    </span>
  ) : (
    <FolderIcon className="shrink-0 text-zinc-400" />
  );

  const countPill = (
    <span
      className={`ml-2 shrink-0 rounded-full bg-black/5 text-zinc-500 dark:bg-white/10 dark:text-zinc-400 ${
        spacious ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"
      }`}
    >
      {count} {spacious ? (count === 1 ? "deck" : "decks") : ""}
    </span>
  );

  return (
    <div
      className={`flex items-center gap-0.5 rounded-md border ${spacious ? "rounded-xl px-3" : "px-1"} ${
        active ? "" : "border-black/10 dark:border-white/10"
      }`}
      style={active ? { background: "var(--accent-btn-bg)", borderColor: "var(--accent-btn-border)" } : undefined}
    >
      {href ? (
        <Link href={href} className={labelClass} style={labelStyle}>
          {iconEl}
          <span className={`min-w-0 flex-1 truncate ${spacious ? "text-base" : ""}`}>{folder.name}</span>
          {countPill}
        </Link>
      ) : (
        <button onClick={onClick} className={labelClass} style={labelStyle}>
          {iconEl}
          <span className={`min-w-0 flex-1 truncate ${spacious ? "text-base" : ""}`}>{folder.name}</span>
          {countPill}
        </button>
      )}
      <button
        onClick={startRename}
        aria-label={`Rename ${folder.name}`}
        className={`shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ${
          spacious ? "px-1.5 text-sm" : "px-1 text-xs"
        }`}
      >
        ✎
      </button>
      <button
        onClick={handleDelete}
        aria-label={`Delete ${folder.name}`}
        className={`shrink-0 text-zinc-400 hover:text-red-500 ${spacious ? "px-1.5 text-base" : "px-1 text-xs"}`}
      >
        ×
      </button>
    </div>
  );
}
