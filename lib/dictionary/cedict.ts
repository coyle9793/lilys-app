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

for (const entry of cedict as { simplified: string; pinyin: string; english: string[] }[]) {
  const { simplified, pinyin, english } = entry;
  maxWordLength = Math.max(maxWordLength, simplified.length);
  // CC-CEDICT lists multiple entries for the same headword (different readings/senses).
  // Keep the first (CC-CEDICT orders by frequency-ish/alphabetical), merge extra definitions in.
  const existing = bySimplified.get(simplified);
  if (existing) {
    for (const def of english) {
      if (!existing.definitions.includes(def)) existing.definitions.push(def);
    }
  } else {
    bySimplified.set(simplified, {
      hanzi: simplified,
      pinyin: numberedPinyinToMarks(pinyin),
      pinyinNumbered: pinyin,
      definitions: [...english],
    });
  }
}

export const MAX_WORD_LENGTH = maxWordLength;

export function lookupWord(word: string): DictEntry | undefined {
  return bySimplified.get(word);
}

export function hasWord(word: string): boolean {
  return bySimplified.has(word);
}
