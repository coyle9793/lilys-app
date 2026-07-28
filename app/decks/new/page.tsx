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
}

type Step = "upload" | "processing" | "review";

export default function NewDeckPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [variant, setVariant] = useState<ChineseVariant>("chi_sim");
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState("");
  const [deckTitle, setDeckTitle] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleExtract() {
    if (files.length === 0) return;
    setError("");
    setStep("processing");

    try {
      const { extractTextFromFile } = await import("@/lib/parsing");
      const allSections: string[] = [];

      for (const file of files) {
        setProgressMessage(`Reading ${file.name}…`);
        const { sections } = await extractTextFromFile(file, {
          chineseVariant: variant,
          onProgress: ({ page, totalPages, ocr }) => {
            setProgressMessage(
              `${file.name}: ${ocr ? "recognizing text" : "reading"} (page ${page}/${totalPages})…`,
            );
          },
        });
        allSections.push(...sections);
      }

      setProgressMessage("Looking up words in the dictionary…");
      const text = allSections.join("\n");
      const res = await fetch("/api/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Dictionary lookup failed.");
      const { words } = (await res.json()) as {
        words: { hanzi: string; pinyin: string; definitions: string[]; found: boolean }[];
      };

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
      if (!deckTitle) setDeckTitle(files[0]?.name.replace(/\.[^.]+$/, "") ?? "New deck");
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong while processing the file.");
      setStep("upload");
    }
  }

  function updateCandidate(id: string, patch: Partial<Candidate>) {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addBlankCandidate() {
    setCandidates((prev) => [
      { id: `manual-${Date.now()}`, hanzi: "", pinyin: "", definition: "", found: true, included: true },
      ...prev,
    ]);
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

  if (step === "review") {
    const includedCount = candidates.filter((c) => c.included).length;
    return (
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="mb-4 text-2xl font-semibold">Review your flashcards</h1>
        <p className="mb-6 text-sm text-zinc-500">
          We found {candidates.length} candidate words. Uncheck anything that doesn&apos;t
          belong, fix any OCR mistakes, and add missing words before saving.
        </p>

        <label className="mb-4 flex flex-col gap-1 text-sm">
          Deck name
          <input
            value={deckTitle}
            onChange={(e) => setDeckTitle(e.target.value)}
            className="w-full max-w-sm rounded-md border border-black/15 px-3 py-2 dark:border-white/15"
          />
        </label>

        <button
          onClick={addBlankCandidate}
          className="mb-3 rounded-md border border-dashed border-black/20 px-3 py-1.5 text-sm text-zinc-500 dark:border-white/20"
        >
          + Add a card manually
        </button>

        <div className="flex flex-col gap-2">
          {candidates.map((c) => (
            <div
              key={c.id}
              className={`grid grid-cols-[auto_1fr_1fr_2fr] items-center gap-2 rounded-md border p-2 ${
                c.found ? "border-black/10 dark:border-white/10" : "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40"
              }`}
            >
              <input
                type="checkbox"
                checked={c.included}
                onChange={(e) => updateCandidate(c.id, { included: e.target.checked })}
              />
              <input
                value={c.hanzi}
                onChange={(e) => updateCandidate(c.id, { hanzi: e.target.value })}
                className="rounded-md border border-black/15 px-2 py-1 text-sm dark:border-white/15"
              />
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
            </div>
          ))}
        </div>

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
        Upload PowerPoint (.pptx), PDF, or photos/screenshots of your slides. Text is
        extracted right in your browser, then looked up in CC-CEDICT for pinyin and
        definitions.
      </p>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Files
          <input
            type="file"
            multiple
            accept=".pptx,.pdf,image/*"
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

        <button onClick={() => router.push("/dashboard")} className="self-start text-sm text-zinc-500 hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
