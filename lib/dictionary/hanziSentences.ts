import { looksLikePinyin } from "./pinyinSentences";

const HAN_CHAR = /\p{Script=Han}/u;

// Grammar-template annotation lines (e.g. "Person + 也(yě)+是(shi) + country +
// 人(rén)") string Hanzi and Latin fragments together with "+" — scaffolding
// for the pattern, never a real sentence or its translation.
const FORMULA_LINE = /[+＋]/;

function looksLikeHeading(line: string): boolean {
  return /^\d+[.)]\s/.test(line);
}

/**
 * True for a line that's a genuine Hanzi sentence rather than a grammar
 * template or a Hanzi+pinyin+gloss vocab line — it may contain Latin
 * punctuation/parens, but not whole English words or "+" scaffolding.
 */
function looksLikeHanziSentence(line: string): boolean {
  if (!HAN_CHAR.test(line)) return false;
  if (FORMULA_LINE.test(line)) return false;
  const latinWords = line.match(/[a-zA-Z]{2,}/g) ?? [];
  return latinWords.length === 0;
}

export interface HanziSentence {
  hanzi: string;
  pinyin: string;
  translation: string;
}

/**
 * Finds Hanzi sentences laid out across three lines — an English
 * translation, the Hanzi sentence, then its pinyin romanization, e.g.:
 *   You are British.
 *   你是英国人。
 *   nǐ shì yīng guó rén
 * so they're kept as one sentence-level flashcard instead of being shredded
 * into individual dictionary words by the word segmenter.
 */
export function extractHanziSentences(text: string): HanziSentence[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const results: HanziSentence[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const hanziLine = lines[i];
    const pinyinLine = lines[i + 1];
    if (!pinyinLine) continue;
    if (!looksLikeHanziSentence(hanziLine)) continue;
    if (!looksLikePinyin(pinyinLine)) continue;

    // Walk back to the nearest usable English line, hopping over grammar
    // "formula" annotations that sometimes sit between a heading and the
    // actual example sentence.
    let translation: string | undefined;
    for (let back = i - 1, hops = 0; back >= 0 && hops < 3; back--, hops++) {
      const candidate = lines[back];
      if (FORMULA_LINE.test(candidate) && HAN_CHAR.test(candidate)) continue;
      if (HAN_CHAR.test(candidate) || looksLikePinyin(candidate) || looksLikeHeading(candidate)) break;
      translation = candidate;
      break;
    }

    if (!translation || seen.has(hanziLine)) continue;
    seen.add(hanziLine);
    results.push({ hanzi: hanziLine, pinyin: pinyinLine, translation });
  }

  return results;
}
