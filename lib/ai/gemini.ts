const DEFAULT_MODEL = "gemini-3-flash-preview";

export function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export type GeminiResult = { ok: true; text: string } | { ok: false; error: string };

/** Pulls Google's own error message out of a Gemini error response body, if present. */
function extractGeminiErrorMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message;
    return typeof message === "string" ? message : null;
  } catch {
    return null;
  }
}

/**
 * Low-level call to Gemini's generateContent REST API. Returns a discriminated
 * result (rather than null) so callers can show the *specific* reason a
 * generation failed — missing key, a bad model name, quota, timeout, malformed
 * response — instead of a generic "something went wrong" that gives a
 * non-technical user nothing to act on. Full detail is also logged server-side.
 */
export async function callGemini(
  prompt: string,
  { maxOutputTokens = 200, timeoutMs = 30_000 }: { maxOutputTokens?: number; timeoutMs?: number } = {},
): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, error: "No Gemini API key is configured on the server." };

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
      const detail = extractGeminiErrorMessage(body);
      return {
        ok: false,
        error: `Gemini API error ${res.status}${detail ? `: ${detail}` : ""} (model "${model}").`,
      };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      console.error("Gemini response had no text:", JSON.stringify(data));
      const finishReason = data?.candidates?.[0]?.finishReason;
      return {
        ok: false,
        error: finishReason
          ? `Gemini returned no text (finish reason: ${finishReason}).`
          : "Gemini returned an empty response.",
      };
    }

    const cleaned = text.trim();
    if (!cleaned) return { ok: false, error: "Gemini returned an empty response." };
    return { ok: true, text: cleaned };
  } catch (err) {
    console.error("Gemini request failed:", err);
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: timedOut ? "The request to Gemini timed out." : `Request to Gemini failed: ${message}`,
    };
  }
}
