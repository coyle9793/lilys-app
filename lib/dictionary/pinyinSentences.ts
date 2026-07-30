import { isFullyPinyinSyllables } from "./reversePinyin";

const TONE_MARK =
  /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǎÌŌÓǑÒŪÚǓÙǕǗǙǛ]/;
const HAN_CHAR = /\p{Script=Han}/u;

/**
 * A line "looks like pinyin" if it has tone-mark diacritics (a strong, fast
 * signal), or — since OCR of photographed pages very often loses those small
 * marks — if most of its words can be fully split into known Mandarin
 * syllables even without tone marks. This only applies to lines with NO
 * Hanzi at all — a line like "高兴 gāoxìng" (Hanzi plus its own pinyin gloss)
 * has tone marks too, but it's not a hanzi-less pinyin sentence; it should be
 * handled by the Han-based dictionary segmenter instead, which can split the
 * hanzi and pinyin apart correctly instead of treating the whole raw line as
 * a single opaque "word".
 */
function looksLikePinyin(line: string): boolean {
  if (HAN_CHAR.test(line)) return false;
  if (TONE_MARK.test(line)) return true;

  const words = line.match(/[a-zA-Zü]+/g) ?? [];
  if (words.length < 2) return false;

  const matching = words.filter((w) => isFullyPinyinSyllables(w)).length;
  return matching / words.length >= 0.6;
}

function looksLikeHeading(line: string): boolean {
  return /^\d+[.)]\s/.test(line);
}

function stripLabel(line: string): string {
  return line.replace(/^\s*(?:[QA]\d*|Q|A)[:.、]\s*/i, "").trim();
}

export interface SentencePair {
  source: string;
  translation: string;
}

/**
 * Finds pinyin sentences paired with an English translation on the next line,
 * e.g. Q&A drill sheets that give romanized Chinese with no Hanzi at all:
 *   Q: Ni hao! Ni jiao shenme mingzi?
 *   Hello! What's your name?
 */
export function extractPinyinSentencePairs(text: string): SentencePair[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const seen = new Map<string, SentencePair>();
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const prev = i > 0 ? lines[i - 1] : undefined;
    const next = lines[i + 1];
    // Strip "Q:"/"A:" labels before checking the pinyin ratio — otherwise the
    // single leftover letter ("Q", "A") counts against the line's word ratio.
    const source = stripLabel(line);
    const translation = next ? stripLabel(next) : undefined;
    // If the line right above this one already has Hanzi, this pinyin line is
    // almost certainly just that Hanzi's own romanization gloss (a vocab list
    // laid out as character line, then pinyin line, then a blank/label line)
    // rather than a standalone hanzi-less sentence — don't pair it with
    // whatever text happens to follow, which is often the *next* item's label.
    const precededByHanzi = prev !== undefined && HAN_CHAR.test(prev);

    if (
      !looksLikeHeading(line) &&
      !precededByHanzi &&
      looksLikePinyin(source) &&
      translation &&
      !looksLikePinyin(translation) &&
      !looksLikeHeading(translation)
    ) {
      if (source && translation && !seen.has(source)) {
        seen.set(source, { source, translation });
      }
      i += 2;
      continue;
    }

    i += 1;
  }

  return [...seen.values()];
}
