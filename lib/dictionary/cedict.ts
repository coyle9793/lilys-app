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

/** CC-CEDICT capitalizes the first letter of proper-noun/surname readings, e.g. "Men2". */
function isProperNoun(pinyinNumbered: string): boolean {
  return /^[A-Z]/.test(pinyinNumbered);
}

/**
 * Keeps a definition short: strips long parenthetical asides (usage notes,
 * cross-references, etymology) that make simple flashcards read like
 * dictionary essays, but keeps short essential qualifiers like "(plural)" or
 * "(coll.)" intact. If stripping would leave nothing (some CC-CEDICT glosses,
 * like grammatical particles, are entirely parenthetical), keep the original.
 */
function simplifyDefinition(def: string): string {
  const stripped = def
    .replace(/\([^()]{14,}\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return stripped || def.trim();
}

function makeEntry(simplified: string, pinyin: string, english: string[]): DictEntry {
  return {
    hanzi: simplified,
    pinyin: numberedPinyinToMarks(pinyin),
    pinyinNumbered: pinyin,
    // Only the first, primary sense — joining every sense/variant produces
    // long, cluttered flashcards rather than a simple definition.
    definitions: [simplifyDefinition(english[0] ?? "")],
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
  // or 门 as the surname "Men2" vs. the everyday word "men2" meaning door/gate).
  // CC-CEDICT doesn't order these by how common they are, and merging
  // definitions across readings produces a nonsense mashup under the wrong
  // pinyin. Prefer a common-word reading over a surname/proper-noun reading;
  // failing that, prefer a neutral tone (5), which is almost always the common
  // grammatical-particle sense a beginner course actually teaches; otherwise
  // keep whichever reading was seen first instead of mixing readings.
  const existingIsProper = isProperNoun(existing.pinyinNumbered);
  const newIsProper = isProperNoun(pinyin);

  if (existingIsProper && !newIsProper) {
    bySimplified.set(simplified, makeEntry(simplified, pinyin, english));
  } else if (!existingIsProper && newIsProper) {
    // Keep the existing common-word reading, ignore the surname/proper-noun one.
  } else if (toneNumber(pinyin) === 5 && toneNumber(existing.pinyinNumbered) !== 5) {
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
