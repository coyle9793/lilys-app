const DEFAULT_MODEL = "gemini-2.5-flash-lite";

/**
 * Asks Gemini to convert a pinyin sentence to Simplified Chinese characters,
 * using the English translation as context to disambiguate homophones (the
 * thing the offline dictionary-only guess in reversePinyin.ts can't do).
 * Returns null on any failure (missing key, network error, empty response)
 * so callers can fall back to the offline guess.
 */
export async function suggestHanziWithGemini(
  pinyin: string,
  translation: string,
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const prompt = `Convert this pinyin sentence to Simplified Chinese characters. Use the English translation to pick the correct character among homophones. Reply with ONLY the Chinese characters — no pinyin, no English, no explanation, no markdown.

Pinyin: ${pinyin}
English translation: ${translation}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 200 },
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) return null;

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return null;

    const cleaned = text.trim();
    return cleaned || null;
  } catch {
    return null;
  }
}
