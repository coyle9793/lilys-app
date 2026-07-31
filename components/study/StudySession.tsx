"use client";

import { useState } from "react";
import Link from "next/link";
import type { Card } from "@/lib/types";
import type { Grade } from "@/lib/srs/sm2";
import { recordReview } from "@/lib/actions/study";
import { awardCoinsForSession } from "@/lib/actions/coins";
import { shuffle } from "./shuffle";
import Flashcard from "./Flashcard";
import MultipleChoice from "./MultipleChoice";
import Typing from "./Typing";

type Mode = "flip" | "choice" | "typing";
type CardSet = "due" | "all";

export default function StudySession({
  deckId,
  allCards,
  dueCards,
}: {
  deckId: string;
  allCards: Card[];
  dueCards: Card[];
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [cardSet, setCardSet] = useState<CardSet>(dueCards.length > 0 ? "due" : "all");
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);

  const canUseMultipleChoice = allCards.length >= 2;

  function start() {
    const source = cardSet === "due" ? dueCards : allCards;
    setQueue(shuffle(source));
    setIndex(0);
  }

  async function handleGrade(card: Card, grade: Grade) {
    await recordReview(deckId, card.id, grade);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (queue && nextIndex === queue.length) {
      await awardCoinsForSession(queue.length);
    }
  }

  const current = queue?.[index];

  if (!mode || !queue) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-medium">Cards to study</p>
          <div className="flex gap-2">
            <button
              onClick={() => setCardSet("due")}
              disabled={dueCards.length === 0}
              className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 ${
                cardSet === "due" ? "border-foreground" : "border-black/15 dark:border-white/15"
              }`}
            >
              Due now ({dueCards.length})
            </button>
            <button
              onClick={() => setCardSet("all")}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                cardSet === "all" ? "border-foreground" : "border-black/15 dark:border-white/15"
              }`}
            >
              All cards ({allCards.length})
            </button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Mode</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => {
                setMode("flip");
                start();
              }}
              disabled={(cardSet === "due" ? dueCards : allCards).length === 0}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
            >
              Flip cards
            </button>
            <button
              onClick={() => {
                setMode("choice");
                start();
              }}
              disabled={!canUseMultipleChoice || (cardSet === "due" ? dueCards : allCards).length === 0}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
            >
              Multiple choice
            </button>
            <button
              onClick={() => {
                setMode("typing");
                start();
              }}
              disabled={(cardSet === "due" ? dueCards : allCards).length === 0}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
            >
              Type pinyin
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg font-medium">Session complete 🎉</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setMode(null);
              setQueue(null);
            }}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
          >
            Study again
          </button>
          <Link href={`/decks/${deckId}`} className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15">
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        {index + 1} / {queue.length}
      </p>
      <StudyModeCard mode={mode} card={current} allCards={allCards} onGrade={(g) => handleGrade(current, g)} />
    </div>
  );
}

function StudyModeCard({
  mode,
  card,
  allCards,
  onGrade,
}: {
  mode: Mode;
  card: Card;
  allCards: Card[];
  onGrade: (grade: Grade) => void;
}) {
  // Key by card id so each mode component remounts (resets its local state) per card.
  if (mode === "flip") return <Flashcard key={card.id} card={card} onGrade={onGrade} />;
  if (mode === "choice")
    return <MultipleChoice key={card.id} card={card} deckCards={allCards} onGrade={onGrade} />;
  return <Typing key={card.id} card={card} onGrade={onGrade} />;
}
