import { callGemini } from "./gemini";

export interface WritingFeedback {
  meetsRequirements: boolean;
  feedback: string;
}

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

/**
 * Has Gemini give brief, constructive feedback on a student's free-form
 * written response to a reading-passage task (e.g. a reply letter), since
 * there's no single fixed "correct answer" to compare against for open
 * writing the way there is for multiple choice.
 */
export async function gradeWriting(
  passage: string,
  taskPrompt: string,
  studentResponse: string,
  markingCriteria?: string,
): Promise<WritingFeedback | null> {
  const criteriaSection = markingCriteria?.trim()
    ? `\nMark strictly against these marking criteria from the student's teacher:\n"""\n${markingCriteria.trim().slice(0, 2000)}\n"""\n`
    : "";

  const prompt = `You are marking a Chinese language student's written response to a reading-and-writing task.

Reading passage the student was given:
"""
${passage}
"""

Task: ${taskPrompt}
${criteriaSection}
Student's response:
"""
${studentResponse}
"""

Evaluate whether the response reasonably completes the task${markingCriteria?.trim() ? ", judged against the marking criteria above" : " — addresses the format/content expected, is roughly the requested length, and uses understandable Chinese (minor grammar mistakes are fine; this is a learner)"}. Give brief, encouraging, constructive feedback (2-4 sentences, in English, pointing out anything worth fixing).

Respond with ONLY valid JSON (no markdown, no code fences, no explanation) matching exactly this shape:
{
  "meetsRequirements": true or false,
  "feedback": "<2-4 sentences of feedback>"
}`;

  const raw = await callGemini(prompt, { maxOutputTokens: 2500, timeoutMs: 45_000 });
  if (!raw) return null;

  try {
    const parsed = JSON.parse(stripCodeFence(raw));
    if (typeof parsed?.meetsRequirements !== "boolean" || typeof parsed?.feedback !== "string") {
      console.error("Writing feedback had unexpected shape:", raw);
      return null;
    }
    return { meetsRequirements: parsed.meetsRequirements, feedback: parsed.feedback };
  } catch (err) {
    console.error("Failed to parse writing feedback JSON:", err, raw);
    return null;
  }
}
