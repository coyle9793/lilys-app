const DEFAULT_MODEL = "gemini-3-flash-preview";

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Low-level call to Gemini's generateContent REST API. Returns the raw text
 * response, or null on any failure (missing key, network error, malformed
 * response) — errors are logged server-side so failures are diagnosable
 * instead of silently vanishing.
 */
export async function callGemini(
  prompt: string,
  { maxOutputTokens = 200, timeoutMs = 30_000 }: { maxOutputTokens?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Gemini API error ${res.status} (model: ${model}):`, body);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      console.error("Gemini response had no text:", JSON.stringify(data));
      return null;
    }

    const cleaned = text.trim();
    return cleaned || null;
  } catch (err) {
    console.error("Gemini request failed:", err);
    return null;
  }
}
