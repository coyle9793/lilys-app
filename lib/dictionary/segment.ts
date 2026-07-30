import { MAX_WORD_LENGTH, lookupWord, type DictEntry } from "./cedict";

const HAN_RUN = /\p{Script=Han}+/gu;

// Slide annotations that show how a character is built from its parts, e.g.
// "门 + 口" under 问 — never real vocabulary on their own, just a teaching note.
const RADICAL_BREAKDOWN_LINE = /^\p{Script=Han}\s*[+＋]\s*(?:\p{Script=Han}\s*[+＋]\s*)*\p{Script=Han}$/u;
const RADICAL_DEFINITION = /radical in chinese characters/i;

export interface SegmentedWord {
  hanzi: string;
  pinyin: string;
  definitions: string[];
  found: boolean;
}

/** True for bound-form radical glyphs (讠, 氵, 亵, etc.) that are never standalone vocabulary. */
function isRadicalNotation(entry: DictEntry): boolean {
  return entry.definitions.some((def) => RADICAL_DEFINITION.test(def));
}

/** Forward maximum matching: at each position, take the longest dictionary match. */
function segmentRun(run: string): SegmentedWord[] {
  const words: SegmentedWord[] = [];
  let i = 0;

  while (i < run.length) {
    let matchLength = 0;
    let sawRadicalOnly = false;

    for (let len = Math.min(MAX_WORD_LENGTH, run.length - i); len >= 1; len--) {
      const candidate = run.slice(i, i + len);
      const entry = lookupWord(candidate);
      if (!entry) continue;
      if (isRadicalNotation(entry)) {
        if (len === 1) sawRadicalOnly = true;
        continue;
      }
      matchLength = len;
      break;
    }

    if (matchLength === 0) {
      if (!sawRadicalOnly) {
        // No dictionary entry even for the single character (rare/OCR noise) — keep
        // it as an unmatched one-character "word" so the user can see and edit it.
        words.push({ hanzi: run[i], pinyin: "", definitions: [], found: false });
      }
      // Bound-form radical glyphs are dropped silently — they're never real
      // vocabulary, just a component marker, so there's nothing to review.
      i += 1;
      continue;
    }

    const hanzi = run.slice(i, i + matchLength);
    const entry = lookupWord(hanzi)!;
    words.push({ hanzi, pinyin: entry.pinyin, definitions: entry.definitions, found: true });
    i += matchLength;
  }

  return words;
}

/**
 * Extracts Chinese words/phrases from arbitrary text (slide text, OCR output),
 * looks each up in CC-CEDICT, and returns deduplicated candidate flashcards
 * in first-seen order.
 */
export function segmentAndLookup(text: string): SegmentedWord[] {
  const filteredText = text
    .split("\n")
    .filter((line) => !RADICAL_BREAKDOWN_LINE.test(line.trim()))
    .join("\n");

  const runs = filteredText.match(HAN_RUN) ?? [];
  const seen = new Map<string, SegmentedWord>();

  for (const run of runs) {
    for (const word of segmentRun(run)) {
      if (!seen.has(word.hanzi)) seen.set(word.hanzi, word);
    }
  }

  return [...seen.values()];
}
