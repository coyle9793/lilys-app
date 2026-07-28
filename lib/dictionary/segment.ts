import { MAX_WORD_LENGTH, lookupWord } from "./cedict";

const HAN_RUN = /\p{Script=Han}+/gu;

export interface SegmentedWord {
  hanzi: string;
  pinyin: string;
  definitions: string[];
  found: boolean;
}

/** Forward maximum matching: at each position, take the longest dictionary match. */
function segmentRun(run: string): SegmentedWord[] {
  const words: SegmentedWord[] = [];
  let i = 0;

  while (i < run.length) {
    let matchLength = 0;

    for (let len = Math.min(MAX_WORD_LENGTH, run.length - i); len >= 1; len--) {
      const candidate = run.slice(i, i + len);
      if (lookupWord(candidate)) {
        matchLength = len;
        break;
      }
    }

    if (matchLength === 0) {
      // No dictionary entry even for the single character (rare/OCR noise) — keep it
      // as an unmatched one-character "word" so the user can see and edit it.
      words.push({ hanzi: run[i], pinyin: "", definitions: [], found: false });
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
  const runs = text.match(HAN_RUN) ?? [];
  const seen = new Map<string, SegmentedWord>();

  for (const run of runs) {
    for (const word of segmentRun(run)) {
      if (!seen.has(word.hanzi)) seen.set(word.hanzi, word);
    }
  }

  return [...seen.values()];
}
