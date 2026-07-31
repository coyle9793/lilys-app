import { callGemini } from "./gemini";

const MAX_SOURCE_CHARS = 12_000;

/**
 * Turns raw slide/PDF/photo text into a readable set of study notes — plain
 * text with blank-line-separated sections and "- " bullet points (no
 * markdown syntax), since notes are shown as plain text in the app. Throws
 * with a specific, user-facing message if generation fails — the caller
 * should surface that message rather than showing a generic failure.
 */
export async function generateNotes(sourceText: string, title: string): Promise<string> {
  const trimmed = sourceText.trim().slice(0, MAX_SOURCE_CHARS);

  const prompt = `You are turning a student's Chinese class slides into a clear set of written study notes.

Slide content (from "${title}"):
"""
${trimmed}
"""

Write a well-organized summary a student can read back over later, in plain English with Chinese vocabulary included where relevant. Group related points together under short section headings. Use "- " at the start of a line for bullet points. Do not use markdown symbols like #, *, or **. Keep it concise — cover the actual content, don't pad it out.

Respond with ONLY the notes text, no preamble or explanation.`;

  const result = await callGemini(prompt, { maxOutputTokens: 2000, timeoutMs: 45_000 });
  if (!result.ok) throw new Error(result.error);
  return result.text;
}
