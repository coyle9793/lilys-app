const TONE_MARK =
  /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǎÌŌÓǑÒŪÚǓÙǕǗǙǛ]/;

function looksLikePinyin(line: string): boolean {
  return TONE_MARK.test(line);
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

    if (!looksLikeHeading(line) && looksLikePinyin(line) && next && !looksLikePinyin(next) && !looksLikeHeading(next)) {
      const source = stripLabel(line);
      const translation = stripLabel(next);
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
