import { isFullyPinyinSyllables } from "./reversePinyin";

const TONE_MARK =
  /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǎÌŌÓǑÒŪÚǓÙǕǗǙǛ]/;

/**
 * A line "looks like pinyin" if it has tone-mark diacritics (a strong, fast
 * signal), or — since OCR of photographed pages very often loses those small
 * marks — if most of its words can be fully split into known Mandarin
 * syllables even without tone marks.
 */
function looksLikePinyin(line: string): boolean {
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
    const next = lines[i + 1];
    // Strip "Q:"/"A:" labels before checking the pinyin ratio — otherwise the
    // single leftover letter ("Q", "A") counts against the line's word ratio.
    const source = stripLabel(line);
    const translation = next ? stripLabel(next) : undefined;

    if (
      !looksLikeHeading(line) &&
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
