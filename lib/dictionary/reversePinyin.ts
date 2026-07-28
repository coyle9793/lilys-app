import cedict from "cedict-json";

interface ReverseEntry {
  hanzi: string;
}

const bySyllableSequence = new Map<string, ReverseEntry>();
const validSyllables = new Set<string>();
let maxSyllableCount = 1;

function stripToneDigit(syllable: string): string {
  return syllable.replace(/[1-5]$/, "").toLowerCase();
}

// CC-CEDICT entries for terms like "T衭" (T-shirt) or "IP地址" use bare Latin
// letters as their "pinyin" (the literal letter name), which would otherwise
// flood the syllable set with nearly every single letter — defeating the
// segmentability check below, since almost any English word could then be
// split letter-by-letter into "valid syllables". Only "a"/"e"/"o" are real
// standalone single-letter Mandarin syllables; everything else single-letter
// (including the erhua-suffix marker "r" from entries like "zhe4 r5") is
// excluded.
const REAL_SINGLE_LETTER_SYLLABLES = new Set(["a", "e", "o"]);

for (const entry of cedict as { simplified: string; pinyin: string }[]) {
  const syllables = entry.pinyin.split(" ").map(stripToneDigit);
  for (const s of syllables) {
    if (!/^[a-z]+$/.test(s)) continue;
    if (s.length === 1 && !REAL_SINGLE_LETTER_SYLLABLES.has(s)) continue;
    validSyllables.add(s);
  }
  maxSyllableCount = Math.max(maxSyllableCount, syllables.length);

  const key = syllables.join(" ");
  if (!bySyllableSequence.has(key)) {
    bySyllableSequence.set(key, { hanzi: entry.simplified });
  }
}

export const VALID_SYLLABLES = validSyllables;
export const MAX_SYLLABLE_COUNT = maxSyllableCount;

// CC-CEDICT has no usage-frequency data, so picking "the first entry" for an
// ambiguous syllable sequence often surfaces an obscure reading instead of
// the common one (e.g. "xiexie" → 泄泻 "diarrhea" instead of 谢谢 "thank
// you"). This curates the most common HSK1-level words — pronouns,
// greetings, family, numbers, dates — to the reading a beginner actually
// means. Anything outside this list falls back to cedict's raw ordering and
// may well be wrong; the UI must present suggestions as guesses to verify,
// never as fact.
// Keys are space-separated *individual syllables* (matching how the main
// syllable-sequence index is built below) — not merged written pinyin words.
const COMMON_WORD_OVERRIDES: [string, string][] = [
  ["wo", "我"], ["ni", "你"], ["nin", "您"], ["ta", "他"],
  ["wo men", "我们"], ["ni men", "你们"], ["ta men", "他们"],
  ["zhe", "这"], ["na", "那"], ["shei", "谁"], ["shen me", "什么"],
  ["zhe li", "这里"], ["na li", "那里"], ["zen me", "怎么"], ["wei shen me", "为什么"],
  ["hao", "好"], ["hen", "很"], ["tai", "太"], ["dou", "都"], ["ye", "也"],
  ["hai", "还"], ["zui", "最"],
  ["shi", "是"], ["you", "有"], ["zai", "在"], ["qu", "去"], ["lai", "来"],
  ["kan", "看"], ["shuo", "说"], ["ting", "听"], ["du", "读"],
  ["xie", "写"], ["xie xie", "谢谢"], ["bu ke qi", "不客气"], ["dui bu qi", "对不起"],
  ["mei guan xi", "没关系"],
  ["chi", "吃"], ["he", "和"], ["zuo", "做"],
  ["xi huan", "喜欢"], ["xiang", "想"], ["hui", "会"], ["neng", "能"], ["ai", "爱"],
  ["jiao", "叫"], ["xing", "姓"], ["gui", "贵"], ["ren shi", "认识"], ["gao xing", "高兴"],
  ["xue sheng", "学生"], ["lao shi", "老师"], ["xue xiao", "学校"], ["tong xue", "同学"],
  ["peng you", "朋友"], ["jia", "家"],
  ["ba ba", "爸爸"], ["ma ma", "妈妈"], ["ge ge", "哥哥"], ["di di", "弟弟"],
  ["jie jie", "姐姐"], ["mei mei", "妹妹"], ["hai zi", "孩子"],
  ["nan", "男"], ["nu", "女"], ["ren", "人"],
  ["zhong guo", "中国"], ["ying guo", "英国"], ["mei guo", "美国"],
  ["xue xi", "学习"], ["gong zuo", "工作"], ["ming zi", "名字"], ["guo jia", "国家"],
  ["da xue", "大学"], ["du lun", "杜伦"],
  ["jin nian", "今年"], ["qu nian", "去年"], ["ming nian", "明年"],
  ["jin tian", "今天"], ["zuo tian", "昨天"], ["ming tian", "明天"],
  ["xing qi", "星期"], ["xing qi tian", "星期天"], ["xing qi yi", "星期一"],
  ["yue", "月"], ["sui", "岁"], ["dian", "点"], ["fen", "分"],
  ["xiao shi", "小时"], ["tian", "天"], ["nian", "年"],
  ["chi fan", "吃饭"], ["shui jiao", "睡觉"],
  ["yi", "一"], ["er", "二"], ["san", "三"], ["si", "四"], ["wu", "五"],
  ["liu", "六"], ["qi", "七"], ["ba", "八"], ["jiu", "九"],
  ["ling", "零"], ["bai", "百"],
  ["kou", "口"], ["ge", "个"], ["ma", "吗"], ["ne", "呢"], ["de", "的"],
  ["le", "了"], ["bu", "不"], ["mei", "没"],
];

for (const [key, hanzi] of COMMON_WORD_OVERRIDES) {
  bySyllableSequence.set(key, { hanzi });
}

const MAX_SYLLABLE_LENGTH = Math.max(...[...validSyllables].map((s) => s.length));

export function isValidSyllable(word: string): boolean {
  return validSyllables.has(stripToneDigit(word));
}

/**
 * Splits an entire written pinyin "word" (multiple syllables run together
 * with no spaces, as is standard pinyin orthography — e.g. "mingzi" for
 * "míngzì") into its constituent syllables, or returns null if it can't be
 * fully accounted for by known Mandarin syllables.
 *
 * Single-letter syllable matches ("a"/"e"/"o") are only allowed when they
 * make up the *whole* word — otherwise short English words trivially "split"
 * into real Mandarin syllables (e.g. "Are" as "a" + "re") and get misread as
 * pinyin.
 */
export function splitWordIntoSyllables(word: string): string[] | null {
  const w = stripToneDigit(word.toLowerCase());
  const n = w.length;
  if (n === 0) return null;
  if (n === 1) return validSyllables.has(w) ? [w] : null;

  const reachable = new Array<boolean>(n + 1).fill(false);
  reachable[0] = true;
  for (let end = 1; end <= n; end++) {
    for (let len = 2; len <= Math.min(MAX_SYLLABLE_LENGTH, end); len++) {
      if (reachable[end - len] && validSyllables.has(w.slice(end - len, end))) {
        reachable[end] = true;
        break;
      }
    }
  }
  if (!reachable[n]) return null;

  const syllables: string[] = [];
  let end = n;
  while (end > 0) {
    let matchedLen = -1;
    for (let len = Math.min(MAX_SYLLABLE_LENGTH, end); len >= 2; len--) {
      const start = end - len;
      if (reachable[start] && validSyllables.has(w.slice(start, end))) {
        matchedLen = len;
        break;
      }
    }
    if (matchedLen === -1) return null; // unreachable given reachable[n], but keeps TS/logic honest
    syllables.unshift(w.slice(end - matchedLen, end));
    end -= matchedLen;
  }
  return syllables;
}

export function isFullyPinyinSyllables(word: string): boolean {
  return splitWordIntoSyllables(word) !== null;
}

/** Strips tone diacritics/digits and normalizes "v"/"u:" to "u" for matching. */
export function toPlainSyllable(word: string): string {
  return word
    .toLowerCase()
    .replace(/u:|ü/g, "u")
    .replace(/v/g, "u")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[1-5]$/, "");
}

/**
 * Best-effort reverse lookup: given a pinyin sentence, tries to reconstruct
 * matching Hanzi via forward-maximum-matching over syllable sequences.
 *
 * This is inherently lossy — most pinyin readings map to several possible
 * characters (homophones), and tone is ignored entirely since OCR/typed
 * pinyin often loses or garbles it. Treat the result as a guess to review,
 * never as an authoritative conversion.
 */
export function suggestHanzi(pinyinText: string): string | null {
  const rawWords = pinyinText.split(/[^a-zA-Zü1-5]+/).filter(Boolean);

  // Written pinyin runs multiple syllables together with no spaces (e.g.
  // "Yingguo" for 英国) — split each word into its component syllables so the
  // sequence-matching below lines up with how cedict's own pinyin is spaced
  // (e.g. "ying guo"), instead of trying to match the whole merged word.
  const tokens: string[] = [];
  for (const raw of rawWords) {
    const plain = toPlainSyllable(raw);
    if (!plain) continue;
    const split = splitWordIntoSyllables(plain);
    tokens.push(...(split ?? [plain]));
  }

  if (tokens.length === 0) return null;

  let result = "";
  let matchedAny = false;
  let i = 0;

  while (i < tokens.length) {
    let matched = false;

    for (let len = Math.min(MAX_SYLLABLE_COUNT, tokens.length - i); len >= 1; len--) {
      const key = tokens.slice(i, i + len).join(" ");
      const entry = bySyllableSequence.get(key);
      if (entry) {
        result += entry.hanzi;
        i += len;
        matched = true;
        matchedAny = true;
        break;
      }
    }

    if (!matched) i += 1;
  }

  return matchedAny ? result : null;
}
