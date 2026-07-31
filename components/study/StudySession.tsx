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
import AnswerStyleMenu, { type AnswerStyle } from "./AnswerStyleMenu";

type Mode = "flip" | "choice" | "typing";
type CardSet = "due" | "all";

const GRADE_ORDER: Grade[] = ["again", "hard", "good", "easy"];
const GRADE_LABEL: Record<Grade, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };
const EMPTY_GROUPS: Record<Grade, Card[]> = { again: [], hard: [], good: [], easy: [] };
const ANSWER_STYLE_KEY = "studyAnswerStyle";

function unionGroups(groups: Record<Grade, Card[]>, selected: Set<Grade>): Card[] {
  const result: Card[] = [];
  for (const g of GRADE_ORDER) {
    if (selected.has(g)) result.push(...groups[g]);
  }
  return result;
}

export default function StudySession({
  deckId,
  allCards,
  dueCards,
  gradeGroups,
}: {
  deckId: string;
  allCards: Card[];
  dueCards: Card[];
  gradeGroups: Record<Grade, Card[]>;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [cardSet, setCardSet] = useState<CardSet>(dueCards.length > 0 ? "due" : "all");
  const [selectedGroups, setSelectedGroups] = useState<Set<Grade>>(new Set());
  const [queue, setQueue] = useState<Card[] | null>(null);
  const [index, setIndex] = useState(0);
  const [sessionGroups, setSessionGroups] = useState<Record<Grade, Card[]>>(EMPTY_GROUPS);
  const [retryGroups, setRetryGroups] = useState<Set<Grade>>(new Set());
  const [answerStyle, setAnswerStyleState] = useState<AnswerStyle>(() => {
    if (typeof window === "undefined") return "ranking";
    return localStorage.getItem(ANSWER_STYLE_KEY) === "swipe" ? "swipe" : "ranking";
  });

  const canUseMultipleChoice = allCards.length >= 2;
  const hasGradeGroups = GRADE_ORDER.some((g) => gradeGroups[g].length > 0);

  const sourceCards =
    selectedGroups.size > 0 ? unionGroups(gradeGroups, selectedGroups) : cardSet === "due" ? dueCards : allCards;

  function setAnswerStyle(style: AnswerStyle) {
    setAnswerStyleState(style);
    try {
      localStorage.setItem(ANSWER_STYLE_KEY, style);
    } catch {
      // localStorage unavailable (private browsing etc.) — the choice just won't persist.
    }
  }

  function toggleSelectedGroup(g: Grade) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function toggleRetryGroup(g: Grade) {
    setRetryGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  function start(cards: Card[]) {
    setQueue(shuffle(cards));
    setIndex(0);
    setSessionGroups(EMPTY_GROUPS);
    setRetryGroups(new Set());
  }

  async function handleGrade(card: Card, grade: Grade) {
    await recordReview(deckId, card.id, grade);
    const updatedSessionGroups: Record<Grade, Card[]> = {
      ...sessionGroups,
      [grade]: [...sessionGroups[grade], card],
    };
    setSessionGroups(updatedSessionGroups);
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (queue && nextIndex === queue.length) {
      const correctCount = queue.length - updatedSessionGroups.again.length;
      await awardCoinsForSession(queue.length, correctCount);
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
              onClick={() => {
                setCardSet("due");
                setSelectedGroups(new Set());
              }}
              disabled={dueCards.length === 0}
              className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-40 ${
                cardSet === "due" && selectedGroups.size === 0 ? "border-foreground" : "border-black/15 dark:border-white/15"
              }`}
            >
              Due now ({dueCards.length})
            </button>
            <button
              onClick={() => {
                setCardSet("all");
                setSelectedGroups(new Set());
              }}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                cardSet === "all" && selectedGroups.size === 0 ? "border-foreground" : "border-black/15 dark:border-white/15"
              }`}
            >
              All cards ({allCards.length})
            </button>
          </div>
        </div>

        {hasGradeGroups && (
          <div>
            <p className="mb-2 text-sm font-medium">Or study by last result</p>
            <div className="flex flex-wrap gap-2">
              {GRADE_ORDER.filter((g) => gradeGroups[g].length > 0).map((g) => (
                <label
                  key={g}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                    selectedGroups.has(g) ? "border-foreground" : "border-black/15 dark:border-white/15"
                  }`}
                >
                  <input type="checkbox" checked={selectedGroups.has(g)} onChange={() => toggleSelectedGroup(g)} />
                  {GRADE_LABEL[g]} ({gradeGroups[g].length})
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-medium">Mode</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => {
                setMode("flip");
                start(sourceCards);
              }}
              disabled={sourceCards.length === 0}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
            >
              Flip cards
            </button>
            <button
              onClick={() => {
                setMode("choice");
                start(sourceCards);
              }}
              disabled={!canUseMultipleChoice || sourceCards.length === 0}
              className="rounded-md border border-black/15 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/15"
            >
              Multiple choice
            </button>
            <button
              onClick={() => {
                setMode("typing");
                start(sourceCards);
              }}
              disabled={sourceCards.length === 0}
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
    const total = queue.length;
    const correctCount = total - sessionGroups.again.length;
    const nonEmptyGroups = GRADE_ORDER.filter((g) => sessionGroups[g].length > 0);
    const retrySelection = unionGroups(sessionGroups, retryGroups);
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg font-medium">Session complete 🎉</p>
        <p className="text-2xl font-semibold">
          {correctCount} / {total} correct
        </p>

        {nonEmptyGroups.length > 0 && (
          <div>
            <p className="mb-2 text-center text-sm font-medium">Study again — pick one or more sets</p>
            <div className="flex flex-wrap justify-center gap-2">
              {nonEmptyGroups.map((g) => (
                <label
                  key={g}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm ${
                    retryGroups.has(g) ? "border-foreground" : "border-black/15 dark:border-white/15"
                  }`}
                >
                  <input type="checkbox" checked={retryGroups.has(g)} onChange={() => toggleRetryGroup(g)} />
                  {GRADE_LABEL[g]} ({sessionGroups[g].length})
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {retrySelection.length > 0 && (
            <button
              onClick={() => start(retrySelection)}
              className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
            >
              Study selected ({retrySelection.length})
            </button>
          )}
          <button
            onClick={() => start(queue)}
            className={
              retrySelection.length > 0
                ? "rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
                : "rounded-md bg-foreground px-4 py-2 text-sm text-background"
            }
          >
            Retry all {total}
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
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {index + 1} / {queue.length}
        </p>
        {mode === "flip" && <AnswerStyleMenu value={answerStyle} onChange={setAnswerStyle} />}
      </div>
      <StudyModeCard
        mode={mode}
        card={current}
        allCards={allCards}
        answerStyle={answerStyle}
        onGrade={(g) => handleGrade(current, g)}
      />
    </div>
  );
}

function StudyModeCard({
  mode,
  card,
  allCards,
  answerStyle,
  onGrade,
}: {
  mode: Mode;
  card: Card;
  allCards: Card[];
  answerStyle: AnswerStyle;
  onGrade: (grade: Grade) => void;
}) {
  // Key by card id so each mode component remounts (resets its local state) per card.
  if (mode === "flip") return <Flashcard key={card.id} card={card} onGrade={onGrade} answerStyle={answerStyle} />;
  if (mode === "choice")
    return <MultipleChoice key={card.id} card={card} deckCards={allCards} onGrade={onGrade} />;
  return <Typing key={card.id} card={card} onGrade={onGrade} />;
}
