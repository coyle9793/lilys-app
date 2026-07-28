import { callGemini } from "./gemini";
import type { Card } from "@/lib/types";

export type ExamQuestionType =
  | "multiple_choice"
  | "translate_to_english"
  | "translate_to_chinese"
  | "fill_in_blank"
  | "short_answer"
  | "writing_task";

export interface ExamQuestion {
  type: ExamQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
  /** For writing_task: a reading passage the student responds to (e.g. a letter). */
  passage?: string;
  /** For writing_task: a rough length target mentioned in the task, e.g. "150 characters". */
  targetLength?: string;
}

export interface GeneratedExam {
  level: string;
  questions: ExamQuestion[];
  /** Marking criteria the user supplied, carried through so writing_task answers can be graded against it. */
  markingCriteria?: string;
}

const MAX_VOCAB_CARDS = 150;
const VALID_TYPES: ExamQuestionType[] = [
  "multiple_choice",
  "translate_to_english",
  "translate_to_chinese",
  "fill_in_blank",
  "short_answer",
  "writing_task",
];

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

function isValidQuestion(q: unknown): q is ExamQuestion {
  if (typeof q !== "object" || q === null) return false;
  const question = q as Record<string, unknown>;
  if (!VALID_TYPES.includes(question.type as ExamQuestionType)) return false;
  if (typeof question.prompt !== "string" || !question.prompt.trim()) return false;
  if (typeof question.answer !== "string" || !question.answer.trim()) return false;
  if (question.type === "multiple_choice") {
    if (!Array.isArray(question.options) || question.options.length < 2) return false;
    if (!question.options.every((o) => typeof o === "string")) return false;
  }
  if (question.passage !== undefined && typeof question.passage !== "string") return false;
  if (question.targetLength !== undefined && typeof question.targetLength !== "string") return false;
  return true;
}

/**
 * Generates a leveled Chinese exam from a deck's vocabulary using Gemini.
 * Optionally matches the style of an example exam the user provides.
 * Returns null if generation or parsing fails (no key configured, API
 * error, or a malformed response) — the caller should show a clear error
 * rather than a fabricated exam.
 */
export async function generateExam(
  cards: Card[],
  questionCount: number,
  exampleFormatText?: string,
  markingCriteria?: string,
): Promise<GeneratedExam | null> {
  const vocabList = cards
    .slice(0, MAX_VOCAB_CARDS)
    .map((c) => `${c.hanzi} | ${c.pinyin} | ${c.definition}`)
    .join("\n");

  const formatSection = exampleFormatText?.trim()
    ? `Here is an example of the exam question format/style to match:\n"""\n${exampleFormatText.trim().slice(0, 4000)}\n"""\nGenerate new questions in a similar style and structure to this example (e.g. if it's a reading-passage-plus-written-reply task, produce that same structure), but do not reuse its exact content — write a fresh passage/questions appropriate for the student's level.`
    : "No example format was given — use a natural mix of question types appropriate for a language exam.";

  const criteriaSection = markingCriteria?.trim()
    ? `\nMarking criteria the student's teacher uses:\n"""\n${markingCriteria.trim().slice(0, 2000)}\n"""\nKeep this in mind when writing "writing_task" prompts/passages and model answers, so the task is actually assessable against these criteria.\n`
    : "";

  const prompt = `You are creating a Chinese language exam for a student, based on vocabulary they have studied.

Vocabulary the student has studied (Hanzi | Pinyin | English):
${vocabList}

${formatSection}
${criteriaSection}
Based on the vocabulary above, estimate the student's approximate proficiency level (e.g. "Beginner (approx. HSK 1)") and generate exactly ${questionCount} exam questions appropriate for that level.

For "multiple_choice", "translate_to_english", "translate_to_chinese", "fill_in_blank", and "short_answer" questions, use ONLY the vocabulary listed above.

For "writing_task" questions (a reading passage the student must respond to, e.g. writing a reply letter — use this type when the example format calls for it), you may write a natural passage at the student's estimated level using generally appropriate vocabulary for that level; it does not need to be strictly limited to the list above, but should stay approachable. Put the reading passage in "passage", the task instructions (including any length requirement, e.g. "Write a reply of about 150 characters") in "prompt", and a model/sample answer in "answer" so a grader has something to compare against.

Respond with ONLY valid JSON (no markdown, no code fences, no explanation) matching exactly this shape:
{
  "level": "<short level description>",
  "questions": [
    {
      "type": "multiple_choice" | "translate_to_english" | "translate_to_chinese" | "fill_in_blank" | "short_answer" | "writing_task",
      "prompt": "<question text, or task instructions for writing_task>",
      "options": ["<exactly 4 options, ONLY for multiple_choice>"],
      "answer": "<the correct answer, or a model answer for writing_task>",
      "passage": "<reading passage text, ONLY for writing_task>",
      "targetLength": "<e.g. '150 characters', ONLY for writing_task, omit if not specified>"
    }
  ]
}`;

  const raw = await callGemini(prompt, { maxOutputTokens: 6000, timeoutMs: 75_000 });
  if (!raw) return null;

  try {
    const parsed = JSON.parse(stripCodeFence(raw));
    if (typeof parsed?.level !== "string" || !Array.isArray(parsed?.questions)) {
      console.error("Generated exam had unexpected shape:", raw);
      return null;
    }
    const questions = parsed.questions.filter(isValidQuestion);
    if (questions.length === 0) {
      console.error("Generated exam had no valid questions:", raw);
      return null;
    }
    return { level: parsed.level, questions, markingCriteria: markingCriteria?.trim() || undefined };
  } catch (err) {
    console.error("Failed to parse generated exam JSON:", err, raw);
    return null;
  }
}
