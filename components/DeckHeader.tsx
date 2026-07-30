"use client";

import { useState, useTransition } from "react";
import { deleteDeck, renameDeck } from "@/lib/actions/decks";
import { TrashIcon } from "./icons";

export default function DeckHeader({ deckId, title }: { deckId: string; title: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [, startTransition] = useTransition();

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            startTransition(() => renameDeck(deckId, value.trim()));
            setEditing(false);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            className="rounded-md border border-black/15 px-2 py-1 text-xl font-semibold dark:border-white/15"
          />
          <button type="submit" className="text-sm underline">
            Save
          </button>
        </form>
      ) : (
        <h1
          className="cursor-pointer text-2xl font-semibold"
          onClick={() => setEditing(true)}
          title="Click to rename"
        >
          {title}
        </h1>
      )}

      <button
        onClick={() => {
          if (confirm(`Delete "${title}" and all its cards? This can't be undone.`)) {
            startTransition(() => deleteDeck(deckId));
          }
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        <TrashIcon />
        Delete deck
      </button>
    </div>
  );
}
