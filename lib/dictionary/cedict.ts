import cedict from "cedict-json";
import { numberedPinyinToMarks } from "./pinyin";

export interface DictEntry {
  hanzi: string;
  pinyin: string;
  pinyinNumbered: string;
  definitions: string[];
}

const bySimplified = new Map<string, DictEntry>();
let maxWordLength = 1;

/** Tone digit of the last syllable in numbered pinyin, e.g. "ma2" -> 2, "ni3 men5" -> 5. */
function toneNumber(pinyinNumbered: string): number {
  const match = pinyinNumbered.match(/(\d)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
}

function makeEntry(simplified: string, pinyin: string, english: string[]): DictEntry {
  return {
    hanzi: simplified,
    pinyin: numberedPinyinToMarks(pinyin),
    pinyinNumbered: pinyin,
    definitions: [...english],
  };
}

for (const entry of cedict as { simplified: string; pinyin: string; english: string[] }[]) {
  const { simplified, pinyin, english } = entry;
  maxWordLength = Math.max(maxWordLength, simplified.length);
  const existing = bySimplified.get(simplified);

  if (!existing) {
    bySimplified.set(simplified, makeEntry(simplified, pinyin, english));
    continue;
  }

  if (existing.pinyinNumbered === pinyin) {
    // Same reading, a second CC-CEDICT entry for it (e.g. a traditional-character
    // variant) — keep just the first, concise definition rather than appending
    // every variant's gloss, which tends toward long, cluttered flashcards.
    continue;
  }

  // Different reading for the same hanzi (a polyphonic word, e.g. 吗 ma2/ma3/ma5,
  // or 了 le5/liao3) — CC-CEDICT doesn't order these by how common they are, and
  // merging definitions across readings produces a nonsense mashup under the
  // wrong pinyin. A neutral tone (5) is almost always the common grammatical-
  // particle sense a beginner course actually teaches, so prefer it if present;
  // otherwise keep whichever reading was seen first instead of mixing readings.
  if (toneNumber(pinyin) === 5 && toneNumber(existing.pinyinNumbered) !== 5) {
    bySimplified.set(simplified, makeEntry(simplified, pinyin, english));
  }
}

export const MAX_WORD_LENGTH = maxWordLength;

export function lookupWord(word: string): DictEntry | undefined {
  return bySimplified.get(word);
}

export function hasWord(word: string): boolean {
  return bySimplified.has(word);
}
