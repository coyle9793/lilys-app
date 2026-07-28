"use client";

import { useState } from "react";
import type { Card } from "@/lib/types";
import type { Grade } from "@/lib/srs/sm2";
import { normalizePinyinForComparison } from "@/lib/dictionary/pinyin";

export default function Typing({ card, onGrade }: { card: Card; onGrade: (grade: Grade) => void }) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function check() {
    if (checked || !value.trim()) return;
    const isCorrect =
      normalizePinyinForComparison(value) === normalizePinyinForComparison(card.pinyin);
    setCorrect(isCorrect);
    setChecked(true);
  }

  function next() {
    onGrade(correct ? "good" : "again");
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-32 w-full max-w-md flex-col items-center justify-center gap-2 rounded-xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
        <p className="text-4xl">{card.hanzi}</p>
        <p className="text-sm text-zinc-500">{card.definition}</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="flex w-full max-w-md flex-col items-center gap-3"
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={checked}
          placeholder="Type the pinyin (tone marks optional)"
          autoFocus
          className="w-full rounded-md border border-black/15 px-3 py-2 text-center dark:border-white/15"
        />
        {!checked && (
          <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-sm text-background">
            Check
          </button>
        )}
      </form>

      {checked && (
        <>
          <p className={correct ? "text-green-600" : "text-red-600"}>
            {correct ? "Correct!" : `Correct answer: ${card.pinyin}`}
          </p>
          <button onClick={next} className="rounded-md bg-foreground px-4 py-2 text-sm text-background">
            Next
          </button>
        </>
      )}
    </div>
  );
}
