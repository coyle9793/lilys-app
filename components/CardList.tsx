"use client";

import { useState, useTransition } from "react";
import { addCard, deleteCard, updateCard } from "@/lib/actions/decks";
import type { Card } from "@/lib/types";
import { PencilIcon, TrashIcon } from "./icons";

function CardForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: { hanzi: string; pinyin: string; definition: string };
  onSubmit: (values: { hanzi: string; pinyin: string; definition: string }) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const [hanzi, setHanzi] = useState(initial.hanzi);
  const [pinyin, setPinyin] = useState(initial.pinyin);
  const [definition, setDefinition] = useState(initial.definition);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!hanzi.trim() || !definition.trim()) return;
        onSubmit({ hanzi: hanzi.trim(), pinyin: pinyin.trim(), definition: definition.trim() });
      }}
      className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]"
    >
      <input
        value={hanzi}
        onChange={(e) => setHanzi(e.target.value)}
        placeholder="Hanzi"
        className="rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15"
      />
      <input
        value={pinyin}
        onChange={(e) => setPinyin(e.target.value)}
        placeholder="Pinyin"
        className="rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15"
      />
      <input
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        placeholder="Definition"
        className="rounded-md border border-black/15 px-2 py-1.5 text-sm dark:border-white/15"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-xs text-zinc-500">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function CardList({ deckId, cards }: { deckId: string; cards: Card[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      {cards.map((card) =>
        editingId === card.id ? (
          <div key={card.id} className="rounded-md border border-black/10 bg-background p-2 dark:border-white/10">
            <CardForm
              initial={card}
              submitLabel="Save"
              onCancel={() => setEditingId(null)}
              onSubmit={(values) => {
                startTransition(() => updateCard(deckId, card.id, values));
                setEditingId(null);
              }}
            />
          </div>
        ) : (
          <div
            key={card.id}
            className="grid grid-cols-1 items-center gap-1 rounded-md border border-black/10 bg-background p-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:gap-2 dark:border-white/10"
          >
            <span className="text-lg">{card.hanzi}</span>
            <span className="text-zinc-500">{card.pinyin}</span>
            <span className="text-sm">{card.definition}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingId(card.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                <PencilIcon />
                Edit
              </button>
              <button
                onClick={() => startTransition(() => deleteCard(deckId, card.id))}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                <TrashIcon />
                Delete
              </button>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <div className="rounded-md border border-black/10 bg-background p-2 dark:border-white/10">
          <CardForm
            initial={{ hanzi: "", pinyin: "", definition: "" }}
            submitLabel="Add"
            onCancel={() => setAdding(false)}
            onSubmit={(values) => {
              startTransition(() => addCard(deckId, values));
              setAdding(false);
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="self-start rounded-md border border-dashed border-black/20 px-3 py-1.5 text-sm text-zinc-500 dark:border-white/20"
        >
          + Add card
        </button>
      )}
    </div>
  );
}
