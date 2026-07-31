"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDeck } from "@/lib/actions/decks";
import type { ChineseVariant } from "@/lib/parsing";

interface Candidate {
  id: string;
  hanzi: string;
  pinyin: string;
  definition: string;
  found: boolean;
  included: boolean;
  guessSource?: "ai" | "dictionary" | null;
}

interface SectionItem {
  id: string;
  label: string;
  text: string;
  included: boolean;
}

type Step = "upload" | "processing" | "select" | "review";

export default function NewDeckPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [variant, setVariant] = useState<ChineseVariant>("chi_sim");
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [saving, setSaving] = useState(false);
  const [guessingId, setGuessingId] = useState<string | null>(null);
  const [existingWordDecks, setExistingWordDecks] = useState<Record<string, string[]>>({});

  async function handleExtract() {
    if (files.length === 0) return;
    setError("");
    setStep("processing");

    try {
      const { extractTextFromFile } = await import("@/lib/parsing");
      const items: SectionItem[] = [];

      for (const file of files) {
        setProgressMessage(`Reading ${file.name}…`);
        const { sections: fileSections } = await extractTextFromFile(file, {
          chineseVariant: variant,
          onProgress: ({ page, totalPages, ocr }) => {
            setProgressMessage(
              `${file.name}: ${ocr ? "recognizing text" : "reading"} (page ${page}/${totalPages})…`,
            );
          },
        });
        fileSections.forEach((text, i) => {
          const label = files.length > 1 ? `${file.name} — page ${i + 1}` : `Page ${i + 1}`;
          items.push({ id: `${file.name}-${i}`, label, text, included: true });
        });
      }

      setSections(items);
      if (!deckTitle) setDeckTitle(files[0]?.name.replace(/\.[^.]+$/, "") ?? "New deck");
      setStep("select");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while processing the file.");
      setStep("upload");
    }
  }

  function setAllSections(included: boolean) {
    setSections((prev) => prev.map((s) => ({ ...s, included })));
  }

  async function handleContinueFromSections() {
    const included = sections.filter((s) => s.included);
    if (included.length === 0) return;
    setError("");
    setStep("processing");
    setProgressMessage("Looking up words in the dictionary…");

    try {
      const text = included.map((s) => s.text).join("\n");
      const [segRes, existingRes] = await Promise.all([
        fetch("/api/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        }),
        fetch("/api/existing-words"),
      ]);
      if (!segRes.ok) throw new Error("Dictionary lookup failed.");
      const { words } = (await segRes.json()) as {
        words: { hanzi: string; pinyin: string; definitions: string[]; found: boolean }[];
      };

      // Flagging repeats across decks is a nice-to-have, not core to saving
      // the deck — if it fails, just show no highlights instead of failing
      // the whole import.
      if (existingRes.ok) {
        const { words: existing } = (await existingRes.json()) as { words: Record<string, string[]> };
        setExistingWordDecks(existing);
      } else {
        setExistingWordDecks({});
      }

      setCandidates(
        words.map((w, i) => ({
          id: `${i}-${w.hanzi}`,
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          definition: w.definitions.slice(0, 3).join("; "),
          found: w.found,
          included: w.found,
        })),
      );
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while processing the file.");
      setStep("select");
    }
  }

  function updateCandidate(id: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function guessCharacters(candidate: Candidate) {
    setGuessingId(candidate.id);
    try {
      const res = await fetch("/api/suggest-hanzi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinyin: candidate.pinyin, translation: candidate.definition }),
      });
      const { hanzi, source } = (await res.json()) as {
        hanzi: string | null;
        source: "ai" | "dictionary" | null;
      };
      if (hanzi) updateCandidate(candidate.id, { hanzi, guessSource: source });
    } finally {
      setGuessingId(null);
    }
  }

  function addBlankCandidate() {
    setCandidates((prev) => [
      { id: `manual-${Date.now()}`, hanzi: "", pinyin: "", definition: "", found: true, included: true },
      ...prev,
    ]);
  }

  function removeRepeatedWords() {
    setCandidates((prev) =>
      prev.map((c) => ((existingWordDecks[c.hanzi]?.length ?? 0) > 0 ? { ...c, included: false } : c)),
    );
  }

  async function handleSave() {
    const selected = candidates.filter((c) => c.included && c.hanzi.trim() && c.definition.trim());
    if (selected.length === 0 || !deckTitle.trim()) return;
    setSaving(true);
    try {
      await createDeck(
        deckTitle.trim(),
        selected.map((c) => ({ hanzi: c.hanzi.trim(), pinyin: c.pinyin.trim(), definition: c.definition.trim() })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the deck.");
      setSaving(false);
    }
  }

  if (step === "select") {
    const includedCount = sections.filter((s) => s.included).length;
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-semibold">Choose which pages to include</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Uncheck title pages, intros, or anything else you don&apos;t want turned into
          flashcards — this keeps them out before we even generate candidate words.
        </p>

        <div className="mb-4 flex gap-4 text-sm">
          <button onClick={() => setAllSections(true)} className="text-zinc-500 hover:underline">
            Select all
          </button>
          <button onClick={() => setAllSections(false)} className="text-zinc-500 hover:underline">
            Deselect all
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {sections.map((s) => (
            <label
              key={s.id}
              className={`flex items-start gap-3 rounded-md border bg-card p-3 text-sm ${
                s.included
                  ? "border-black/10 dark:border-white/10"
                  : "border-black/5 opacity-50 dark:border-white/5"
              }`}
            >
              <input
                type="checkbox"
                checked={s.included}
                onChange={(e) =>
                  setSections((prev) =>
                    prev.map((x) => (x.id === s.id ? { ...x, included: e.target.checked } : x)),
                  )
                }
                className="mt-1"
              />
              <div>
                <p className="mb-1 text-xs font-medium text-zinc-500">{s.label}</p>
                <p className="whitespace-pre-wrap">
                  {s.text.trim() || <span className="italic text-zinc-400">(no text found)</span>}
                </p>
              </div>
            </label>
          ))}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleContinueFromSections}
            disabled={includedCount === 0}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
          >
            Continue with {includedCount} page{includedCount === 1 ? "" : "s"}
          </button>
          <button onClick={() => setStep("upload")} className="text-sm text-zinc-500 hover:underline">
            Start over
          </button>
        </div>
      </div>
    );
  }

  if (step === "review") {
    const includedCount = candidates.filter((c) => c.included).length;
    const repeatedCount = candidates.filter(
      (c) => c.included && (existingWordDecks[c.hanzi]?.length ?? 0) > 0,
    ).length;
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-semibold">Review your flashcards</h1>
        <p className="mb-6 text-sm text-zinc-500">
          We found {candidates.length} candidate flashcards. Uncheck anything that
          doesn&apos;t belong, fix any OCR mistakes, and add missing ones before saving.
          {repeatedCount > 0 &&
            " Words that already appear in one of your other decks are highlighted in purple."}
        </p>

        <label className="mb-4 flex flex-col gap-1 text-sm">
          Deck name
          <input
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            className="w-full max-w-sm rounded-md border border-black/15 px-3 py-2 dark:border-white/15"
          />
        </label>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <button
            onClick={addBlankCandidate}
            className="rounded-md border border-dashed border-black/20 px-3 py-1.5 text-sm text-zinc-500 dark:border-white/20"
          >
            + Add a card manually
          </button>
          {repeatedCount > 0 && (
            <button
              onClick={removeRepeatedWords}
              className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
            >
              Remove {repeatedCount} word{repeatedCount === 1 ? "" : "s"} already in other decks
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {candidates.map((c) => {
            const isPinyinOnly = c.pinyin.length > 0 && c.hanzi === c.pinyin;
            const repeatDecks = existingWordDecks[c.hanzi] ?? [];
            return (
              <div
                key={c.id}
                className={`grid grid-cols-[auto_1fr_1fr_2fr_auto] items-center gap-2 rounded-md border p-2 ${
                  !c.found
                    ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
                    : repeatDecks.length > 0
                      ? "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30"
                      : "border-black/10 bg-card dark:border-white/10"
                }`}
              >
                <input
                  type="checkbox"
                  checked={c.included}
                  onChange={(e) => updateCandidate(c.id, { included: e.target.checked })}
                />
                <div className="flex flex-col gap-0.5">
                  <input
                    value={c.hanzi}
                    onChange={(e) => updateCandidate(c.id, { hanzi: e.target.value, guessSource: undefined })}
                    className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15"
                  />
                  {c.guessSource === "ai" && (
                    <span className="text-[10px] text-blue-500">AI guess — check it</span>
                  )}
                  {c.guessSource === "dictionary" && (
                    <span className="text-[10px] text-amber-600">rough guess — likely wrong</span>
                  )}
                  {repeatDecks.length > 0 && (
                    <span className="text-[10px] text-violet-600 dark:text-violet-400">
                      Also in: {repeatDecks.slice(0, 2).join(", ")}
                      {repeatDecks.length > 2 ? ` +${repeatDecks.length - 2} more` : ""}
                    </span>
                  )}
                </div>
                <input
                  value={c.pinyin}
                  onChange={(e) => updateCandidate(c.id, { pinyin: e.target.value })}
                  className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15"
                />
                <input
                  value={c.definition}
                  onChange={(e) => updateCandidate(c.id, { definition: e.target.value })}
                  className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15"
                />
                {isPinyinOnly ? (
                  <button
                    onClick={() => guessCharacters(c)}
                    disabled={guessingId === c.id}
                    title="Best-effort guess only — Chinese has many same-sounding characters, so this is often wrong. Always check it."
                    className="whitespace-nowrap rounded-md border border-dashed border-black/20 px-2 py-1 text-xs text-zinc-500 disabled:opacity-50 dark:border-white/20"
                  >
                    {guessingId === c.id ? "Guessing…" : "Guess 汉字*"}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          * Character guesses are best-effort, not guaranteed correct — Chinese has
          many characters that share the same pronunciation. If a free Gemini API key
          is configured (see README), guesses use AI with the English translation as
          context and are usually right; without one, guesses fall back to a plain
          dictionary lookup and are frequently wrong. Always check before trusting.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || includedCount === 0 || !deckTitle.trim()}
            className="rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
          >
            {saving ? "Saving…" : `Save ${includedCount} cards`}
          </button>
          <button onClick={() => setStep("upload")} className="text-sm text-zinc-500 hover:underline">
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Import slides</h1>
      <p className="mb-6 text-sm text-zinc-500">
        Upload PowerPoint (.pptx), Word (.docx), PDF, or photos/screenshots of your
        slides. Text is extracted right in your browser, then looked up in CC-CEDICT
        for pinyin and definitions.
      </p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Files
          <input
            type="file"
            multiple
            accept=".pptx,.docx,.pdf,image/*"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="rounded-md border border-black/15 px-3 py-2 dark:border-white/15"
          />
        </label>

        {files.length > 0 && (
          <ul className="text-sm text-zinc-500">
            {files.map((f) => (
              <li key={f.name}>{f.name}</li>
            ))}
          </ul>
        )}

        <fieldset className="flex flex-col gap-1 text-sm">
          <legend className="mb-1">Character set (for photo/scanned OCR)</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={variant === "chi_sim"}
              onChange={() => setVariant("chi_sim")}
            />
            Simplified
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={variant === "chi_tra"}
              onChange={() => setVariant("chi_tra")}
            />
            Traditional
          </label>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {step === "processing" ? (
          <p className="text-sm text-zinc-500">{progressMessage || "Processing…"}</p>
        ) : (
          <button
            onClick={handleExtract}
            disabled={files.length === 0}
            className="self-start rounded-md bg-foreground px-4 py-2 text-sm text-background disabled:opacity-60"
          >
            Extract flashcards
          </button>
        )}

        <button onClick={() => router.push("/decks")} className="self-start text-sm text-zinc-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
