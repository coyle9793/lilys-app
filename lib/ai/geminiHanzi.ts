import { callGemini } from "./gemini";

/**
 * Asks Gemini to convert a pinyin sentence to Simplified Chinese characters,
 * using the English translation as context to disambiguate homophones (the
 * thing the offline dictionary-only guess in reversePinyin.ts can't do).
 * Returns null on any failure so callers can fall back to the offline guess.
 */
export async function suggestHanziWithGemini(
  pinyin: string,
  translation: string,
): Promise<string | null> {
  const prompt = `Convert this pinyin sentence to Simplified Chinese characters. Use the English translation to pick the correct character among homophones. Reply with ONLY the Chinese characters — no pinyin, no English, no explanation, no markdown.

Pinyin: ${pinyin}
English translation: ${translation}`;

  return callGemini(prompt, { maxOutputTokens: 200 });
}
