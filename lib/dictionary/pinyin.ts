const TONE_MARKS: Record<string, string[]> = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};

function markSyllable(rawSyllable: string): string {
  const match = rawSyllable.match(/^([a-zA-Z:]+)([1-5])?$/);
  if (!match) return rawSyllable;

  const [, body, toneStr] = match;
  const tone = toneStr ? Number(toneStr) : 5;
  const syllable = body.replace(/u:/g, "ü").replace(/v/g, "ü");

  if (tone === 5) return syllable;

  let vowelIndex = -1;
  let vowel = "";
  if (syllable.includes("a")) {
    vowelIndex = syllable.indexOf("a");
    vowel = "a";
  } else if (syllable.includes("e")) {
    vowelIndex = syllable.indexOf("e");
    vowel = "e";
  } else if (syllable.includes("ou")) {
    vowelIndex = syllable.indexOf("o");
    vowel = "o";
  } else {
    for (let i = syllable.length - 1; i >= 0; i--) {
      const ch = syllable[i];
      if ("iouü".includes(ch)) {
        vowelIndex = i;
        vowel = ch;
        break;
      }
    }
  }

  if (vowelIndex === -1) return syllable;

  const marked = TONE_MARKS[vowel][tone];
  return syllable.slice(0, vowelIndex) + marked + syllable.slice(vowelIndex + 1);
}

/** Converts CC-CEDICT numbered pinyin ("ni3 hao3") to accented pinyin ("nǐ hǎo"). */
export function numberedPinyinToMarks(numbered: string): string {
  return numbered
    .split(" ")
    .map((syllable) => (syllable === "" ? syllable : markSyllable(syllable)))
    .join(" ");
}

/**
 * Normalizes pinyin for tone-insensitive comparison: lowercases, maps "v" to
 * "ü" typing convention, strips tone diacritics, and removes spaces/punctuation.
 */
export function normalizePinyinForComparison(pinyin: string): string {
  return pinyin
    .toLowerCase()
    .replace(/v/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");
}
