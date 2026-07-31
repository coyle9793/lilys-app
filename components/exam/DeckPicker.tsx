"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DeckOption {
  id: string;
  title: string;
  cardCount: number;
}

export default function DeckPicker({ decks }: { decks: DeckOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = selected.size;
  const totalCards = decks
    .filter((d) => selected.has(d.id))
    .reduce((sum, d) => sum + d.cardCount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {decks.map((deck) => (
          <label
            key={deck.id}
            className={`flex items-center justify-between gap-3 rounded-lg border bg-card p-4 ${
              selected.has(deck.id) ? "border-foreground" : "border-black/10 dark:border-white/10"
            }`}
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(deck.id)}
                onChange={() => toggle(deck.id)}
              />
              <span className="font-medium">{deck.title}</span>
            </span>
            <span className="text-sm text-zinc-500">{deck.cardCount} cards</span>
          </label>
        ))}
      </div>

      {totalCards === 0 && selectedCount > 0 && (
        <p className="text-sm text-red-600">
          The selected deck{selectedCount === 1 ? "" : "s"} have no cards yet.
        </p>
      )}

      <button
        onClick={() => router.push(`/exam?decks=${[...selected].join(",")}`)}
        disabled={selectedCount === 0 || totalCards === 0}
        className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
      >
        Continue with {selectedCount} deck{selectedCount === 1 ? "" : "s"}
      </button>
    </div>
  );
}
