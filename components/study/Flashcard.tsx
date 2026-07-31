"use client";

import { useEffect, useState } from "react";
import type { Card } from "@/lib/types";
import type { Grade } from "@/lib/srs/sm2";
import type { AnswerStyle } from "./AnswerStyleMenu";

export default function Flashcard({
  card,
  onGrade,
  answerStyle = "ranking",
}: {
  card: Card;
  onGrade: (grade: Grade) => void;
  answerStyle?: AnswerStyle;
}) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!flipped || answerStyle !== "swipe") return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") onGrade("good");
      else if (e.key === "ArrowLeft") onGrade("again");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flipped, answerStyle, onGrade]);

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={() => setFlipped((f) => !f)}
        className="flex h-56 w-full max-w-md flex-col items-center justify-center gap-3 rounded-xl border border-black/10 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-zinc-900"
      >
        {!flipped ? (
          <span className="text-5xl">{card.hanzi}</span>
        ) : (
          <>
            <span className="text-3xl">{card.hanzi}</span>
            <span className="text-lg text-zinc-500">{card.pinyin}</span>
            <span className="text-base">{card.definition}</span>
          </>
        )}
      </button>
      <p className="text-sm text-zinc-500">
        {!flipped
          ? "Click the card to flip it"
          : answerStyle === "swipe"
            ? "Press → if you got it right, ← if you got it wrong"
            : "How well did you know this?"}
      </p>

      {flipped &&
        (answerStyle === "swipe" ? (
          <div className="flex gap-3">
            <button
              onClick={() => onGrade("again")}
              aria-label="Got it wrong"
              className="rounded-md bg-red-100 px-6 py-3 text-base font-medium text-red-800 dark:bg-red-950 dark:text-red-300"
            >
              ← Wrong
            </button>
            <button
              onClick={() => onGrade("good")}
              aria-label="Got it right"
              className="rounded-md bg-green-100 px-6 py-3 text-base font-medium text-green-800 dark:bg-green-950 dark:text-green-300"
            >
              Right →
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onGrade("again")}
              className="rounded-md bg-red-100 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300"
            >
              Again
            </button>
            <button
              onClick={() => onGrade("hard")}
              className="rounded-md bg-amber-100 px-4 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              Hard
            </button>
            <button
              onClick={() => onGrade("good")}
              className="rounded-md bg-green-100 px-4 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
            >
              Good
            </button>
            <button
              onClick={() => onGrade("easy")}
              className="rounded-md bg-blue-100 px-4 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-300"
            >
              Easy
            </button>
          </div>
        ))}
    </div>
  );
}
