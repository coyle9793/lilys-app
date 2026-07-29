import { callGemini } from "./gemini";
import { classifyMark, type WritingFeedback } from "./writingScore";

export type { WritingFeedback };

/**
 * Default rubric used when the user hasn't pasted their own marking
 * criteria — a condensed UK-university-style classification scheme
 * (content, coherence & cohesion, use of language, accuracy of language,
 * characters — each weighted 20%), matching the shape of typical Chinese
 * language department writing rubrics (e.g. Durham CFLS Annex E).
 */
const DEFAULT_RUBRIC = `Mark as a UK university Chinese-language written assessment. Score each of these 5 categories independently out of 100, each worth 20% of the overall mark:
- Content: understanding of the topic and task completion.
- Coherence & Cohesion: logical structure and links within/between sentences.
- Use of Language: range and appropriateness of vocabulary and register.
- Accuracy of Language: grammar, spelling, punctuation.
- Characters: clarity and accuracy of the Chinese characters written.

Use standard UK classification bands for each category:
86+ Exemplary (1st); 75-85 Outstanding (1st); 70-74 Excellent (1st); 65-69 Very good (2:1 upper); 60-64 Good (2:1 lower); 55-59 Reasonably good (2:2 upper); 50-54 Satisfactory (2:2 lower); 45-49 Barely satisfactory (3rd upper); 40-44 Barely adequate (3rd); 35-39 Inadequate (Fail); 30-34 Poor (Fail); 20-29 Very poor (Fail); 10-19 Fail; 0-9 Virtually no evidence (Fail).`;

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

function clampScore(n: unknown): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0;
}

/**
 * Has Gemini mark a student's free-form written response to a
 * reading-passage task (e.g. a reply letter) using a UK-university-style
 * classification scheme, since there's no single fixed "correct answer"
 * to compare against for open writing the way there is for multiple choice.
 */
export async function gradeWriting(
  passage: string,
  taskPrompt: string,
  studentResponse: string,
  markingCriteria?: string,
): Promise<WritingFeedback | null> {
  const rubric = markingCriteria?.trim() ? markingCriteria.trim().slice(0, 2000) : DEFAULT_RUBRIC;

  const prompt = `You are marking a Chinese language student's written response to a reading-and-writing task, using a UK university marking scheme.

Reading passage the student was given:
"""
${passage}
"""

Task: ${taskPrompt}

Marking scheme:
"""
${rubric}
"""

Student's response:
"""
${studentResponse}
"""

Score the response on EACH of these 5 categories independently as an integer 0-100, using the marking scheme's bands: content, coherence (structure/links), language (vocabulary range and register), accuracy (grammar/spelling/punctuation), characters (clarity and accuracy of the Hanzi written). This is a learner — be fair but realistic, not automatically generous. Then give brief, constructive feedback (2-4 sentences, in English) explaining the marks and what would raise them.

Respond with ONLY valid JSON (no markdown, no code fences, no explanation) matching exactly this shape:
{
  "scores": {
    "content": <integer 0-100>,
    "coherence": <integer 0-100>,
    "language": <integer 0-100>,
    "accuracy": <integer 0-100>,
    "characters": <integer 0-100>
  },
  "feedback": "<2-4 sentences of feedback>"
}`;

  const raw = await callGemini(prompt, { maxOutputTokens: 2500, timeoutMs: 45_000 });
  if (!raw) return null;

  try {
    const parsed = JSON.parse(stripCodeFence(raw));
    const s = parsed?.scores;
    if (typeof s !== "object" || s === null || typeof parsed?.feedback !== "string") {
      console.error("Writing feedback had unexpected shape:", raw);
      return null;
    }
    const scores = {
      content: clampScore(s.content),
      coherence: clampScore(s.coherence),
      language: clampScore(s.language),
      accuracy: clampScore(s.accuracy),
      characters: clampScore(s.characters),
    };
    const score = Math.round(
      (scores.content + scores.coherence + scores.language + scores.accuracy + scores.characters) / 5,
    );
    return { score, classification: classifyMark(score), scores, feedback: parsed.feedback };
  } catch (err) {
    console.error("Failed to parse writing feedback JSON:", err, raw);
    return null;
  }
}
