"use client";

import { useState, useTransition } from "react";
import { deleteDeck, renameDeck } from "@/lib/actions/decks";

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
        className="text-sm text-red-600 hover:underline"
      >
        Delete deck
      </button>
    </div>
  );
}
