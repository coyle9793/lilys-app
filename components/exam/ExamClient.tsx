"use client";

import { useState } from "react";
import Link from "next/link";
import type { ExamQuestion, GeneratedExam } from "@/lib/ai/examGenerator";

type Step = "setup" | "taking" | "results";

export default function ExamClient({ deckId, cardCount }: { deckId: string; cardCount: number }) {
  const [step, setStep] = useState<Step>("setup");
  const [questionCount, setQuestionCount] = useState(10);
  const [exampleFormatText, setExampleFormatText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [exam, setExam] = useState<GeneratedExam | null>(null);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  async function handleExampleFile(file: File) {
    setExtracting(true);
    setError("");
    try {
      const { extractTextFromFile } = await import("@/lib/parsing");
      const { sections } = await extractTextFromFile(file);
      setExampleFormatText((prev) => [prev, ...sections].filter(Boolean).join("\n").slice(0, 4000));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deckId, questionCount, exampleFormatText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't generate the exam.");
      setExam(data as GeneratedExam);
      setIndex(0);
      setResults([]);
      setStep("taking");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the exam.");
    } finally {
      setGenerating(false);
    }
  }

  function recordResult(correct: boolean) {
    setResults((prev) => [...prev, correct]);
    setSelected(null);
    setFreeText("");
    setChecked(false);
    if (exam && index + 1 >= exam.questions.length) {
      setStep("results");
    } else {
      setIndex((i) => i + 1);
    }
  }

  if (step === "setup") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500">
          Generates an AI-written exam from this deck&apos;s {cardCount} card
          {cardCount === 1 ? "" : "s"}. The AI estimates a rough level from your
          vocabulary and writes questions to match — treat both as a helpful guide,
          not a certified score.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Number of questions
          <select
            value={questionCount}
            onChange={(e) => setQuestionCount(Number(e.target.value))}
            className="w-32 rounded-md border border-black/15 px-2 py-1.5 dark:border-white/15"
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Match the format of a previous exam (optional)
          <textarea
            value={exampleFormatText}
            onChange={(e) => setExampleFormatText(e.target.value)}
            rows={5}
            placeholder="Paste example questions here, or upload a file below…"
            className="rounded-md border border-black/15 px-3 py-2 text-sm dark:border-white/15"
          />
        </label>
        <input
          type="file"
          accept=".pptx,.docx,.pdf,image/*"
          onChange={(e) => e.target.files?.[0] && handleExampleFile(e.target.files[0])}
          className="text-sm"
        />
        {extracting && <p className="text-sm text-zinc-500">Reading file…</p>}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate exam"}
        </button>
      </div>
    );
  }

  if (step === "results") {
    const score = results.filter(Boolean).length;
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg font-medium">
          You scored {score} / {results.length}
        </p>
        {exam && <p className="text-sm text-zinc-500">Estimated level: {exam.level}</p>}
        <div className="flex gap-3">
          <button
            onClick={() => setStep("setup")}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
          >
            Generate another
          </button>
          <Link
            href={`/decks/${deckId}`}
            className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            Back to deck
          </Link>
        </div>
      </div>
    );
  }

  if (!exam) return null;
  const question = exam.questions[index];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">
        Question {index + 1} / {exam.questions.length} · Estimated level: {exam.level}
      </p>
      <QuestionCard
        key={index}
        question={question}
        selected={selected}
        setSelected={setSelected}
        freeText={freeText}
        setFreeText={setFreeText}
        checked={checked}
        setChecked={setChecked}
        onResult={recordResult}
      />
    </div>
  );
}

function QuestionCard({
  question,
  selected,
  setSelected,
  freeText,
  setFreeText,
  checked,
  setChecked,
  onResult,
}: {
  question: ExamQuestion;
  selected: string | null;
  setSelected: (v: string | null) => void;
  freeText: string;
  setFreeText: (v: string) => void;
  checked: boolean;
  setChecked: (v: boolean) => void;
  onResult: (correct: boolean) => void;
}) {
  if (question.type === "multiple_choice") {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
          <p className="text-lg">{question.prompt}</p>
        </div>
        <div className="flex flex-col gap-2">
          {(question.options ?? []).map((option) => {
            const isCorrect = option === question.answer;
            const isSelected = option === selected;
            let style = "border-black/15 dark:border-white/15";
            if (selected) {
              if (isCorrect) style = "border-green-500 bg-green-50 dark:bg-green-950/40";
              else if (isSelected) style = "border-red-500 bg-red-50 dark:bg-red-950/40";
            }
            return (
              <button
                key={option}
                onClick={() => !selected && setSelected(option)}
                className={`rounded-md border px-4 py-2 text-left text-sm ${style}`}
              >
                {option}
              </button>
            );
          })}
        </div>
        {selected && (
          <button
            onClick={() => onResult(selected === question.answer)}
            className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background"
          >
            Next
          </button>
        )}
      </div>
    );
  }

  // Free-text types: translate_to_english, translate_to_chinese, fill_in_blank, short_answer.
  // No reliable way to auto-grade open text, so the student self-grades after seeing the answer.
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-black/10 bg-white p-6 text-center dark:border-white/10 dark:bg-zinc-900">
        <p className="text-lg">{question.prompt}</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!checked) setChecked(true);
        }}
        className="flex flex-col items-center gap-3"
      >
        <input
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          disabled={checked}
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
          <p className="text-center text-sm text-zinc-500">Answer: {question.answer}</p>
          <p className="text-center text-sm">Were you right?</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => onResult(true)}
              className="rounded-md bg-green-100 px-4 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-300"
            >
              Yes
            </button>
            <button
              onClick={() => onResult(false)}
              className="rounded-md bg-red-100 px-4 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-300"
            >
              No
            </button>
          </div>
        </>
      )}
    </div>
  );
}
