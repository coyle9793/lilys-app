"use client";

import { useMemo, useState } from "react";
import type { Card } from "@/lib/types";
import type { Grade } from "@/lib/srs/sm2";
import { shuffle } from "./shuffle";

export default function MultipleChoice({
  card,
  deckCards,
  onGrade,
}: {
  card: Card;
  deckCards: Card[];
  onGrade: (grade: Grade) => void;
}) {
  const options = useMemo(() => {
    const distractorPool = deckCards.filter(
      (c) => c.id !== card.id && c.definition !== card.definition,
    );
    const distractors = shuffle(distractorPool).slice(0, 3).map((c) => c.definition);
    return shuffle([card.definition, ...distractors]);
  }, [card, deckCards]);

  const [selected, setSelected] = useState<string | null>(null);

  function choose(option: string) {
    if (selected) return;
    setSelected(option);
  }

  function next() {
    onGrade(selected === card.definition ? "good" : "again");
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-32 w-full max-w-md items-center justify-center rounded-xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
        <div>
          <p className="text-4xl">{card.hanzi}</p>
          <p className="mt-1 text-sm text-zinc-500">{card.pinyin}</p>
        </div>
      </div>

      <div className="flex w-full max-w-md flex-col gap-2">
        {options.map((option) => {
          const isCorrect = option === card.definition;
          const isSelected = option === selected;
          let style = "border-black/15 dark:border-white/15";
          if (selected) {
            if (isCorrect) style = "border-green-500 bg-green-50 dark:bg-green-950/40";
            else if (isSelected) style = "border-red-500 bg-red-50 dark:bg-red-950/40";
          }
          return (
            <button
              key={option}
              onClick={() => choose(option)}
              className={`rounded-md border px-4 py-2 text-left text-sm ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected && (
        <button onClick={next} className="rounded-md bg-foreground px-4 py-2 text-sm text-background">
          Next
        </button>
      )}
    </div>
  );
}
