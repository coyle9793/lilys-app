import { callGemini } from "./gemini";
import type { Card } from "@/lib/types";

export type ExamQuestionType =
  | "multiple_choice"
  | "translate_to_english"
  | "translate_to_chinese"
  | "fill_in_blank"
  | "short_answer"
  | "writing_task";

/** Which single kind of exam to generate — the whole exam is one mode, not a mix. */
export type ExamMode = "questions" | "multiple_choice" | "reading";

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

const MODE_TYPES: Record<ExamMode, ExamQuestionType[]> = {
  questions: ["translate_to_english", "translate_to_chinese", "fill_in_blank", "short_answer"],
  multiple_choice: ["multiple_choice"],
  reading: ["writing_task"],
};

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

/**
 * Best-effort recovery for a Gemini response that isn't quite clean JSON —
 * trims stray text before/after the object (despite being told not to
 * include any) by taking the outermost {...} span before giving up.
 */
function extractJsonObject(text: string): string {
  const stripped = stripCodeFence(text).trim();
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {
    // Fall through to bracket-matching below.
  }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  return start !== -1 && end > start ? stripped.slice(start, end + 1) : stripped;
}

function isValidQuestion(q: unknown, allowedTypes: ExamQuestionType[]): q is ExamQuestion {
  if (typeof q !== "object" || q === null) return false;
  const question = q as Record<string, unknown>;
  if (!allowedTypes.includes(question.type as ExamQuestionType)) return false;
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

function modeInstruction(mode: ExamMode, questionCount: number): string {
  if (mode === "multiple_choice") {
    return `Generate ONLY "multiple_choice" questions — each with exactly 4 options — using ONLY the vocabulary listed above. Do not generate any other question type.`;
  }
  if (mode === "reading") {
    return `Generate ONLY "writing_task" questions. Each one is a fresh, self-contained reading passage (e.g. a letter or short note) the student must respond to in writing, with task instructions and a model answer. Generate exactly ${questionCount} separate reading+writing tasks, each about a different topic so they don't repeat. If an example format was given above, closely follow its structure (greeting, sign-off, tone, length target) for EVERY task, not just some of them — this mode should never produce any other question type.`;
  }
  return `Generate ONLY "translate_to_english", "translate_to_chinese", "fill_in_blank", and "short_answer" questions, using ONLY the vocabulary listed above. Do not generate multiple_choice or writing_task questions.`;
}

/**
 * Generates a leveled Chinese exam from a deck's vocabulary using Gemini.
 * `mode` picks a single question style for the whole exam (short-answer
 * style questions, multiple choice, or reading-passage-plus-written-reply)
 * so the result is consistent rather than an unpredictable mix. Optionally
 * matches the style of an example exam the user provides. Throws with a
 * specific, user-facing message if generation or parsing fails (no key
 * configured, a Gemini API error, or a malformed response) — the caller
 * should surface that message rather than showing a generic failure.
 */
export async function generateExam(
  cards: Card[],
  questionCount: number,
  mode: ExamMode,
  exampleFormatText?: string,
  markingCriteria?: string,
): Promise<GeneratedExam> {
  const allowedTypes = MODE_TYPES[mode];

  const vocabList = cards
    .slice(0, MAX_VOCAB_CARDS)
    .map((c) => `${c.hanzi} | ${c.pinyin} | ${c.definition}`)
    .join("\n");

  const formatSection = exampleFormatText?.trim()
    ? `Here is an example of the exam question format/style to match:\n"""\n${exampleFormatText.trim().slice(0, 4000)}\n"""\nGenerate new questions in a similar style and structure to this example, but do not reuse its exact content — write fresh content appropriate for the student's level.`
    : "No example format was given.";

  const criteriaSection = markingCriteria?.trim()
    ? `\nMarking criteria the student's teacher uses:\n"""\n${markingCriteria.trim().slice(0, 2000)}\n"""\nKeep this in mind so the task is actually assessable against these criteria.\n`
    : "";

  const prompt = `You are creating a Chinese language exam for a student, based on vocabulary they have studied.

Vocabulary the student has studied (Hanzi | Pinyin | English):
${vocabList}

${formatSection}
${criteriaSection}
Based on the vocabulary above, estimate the student's approximate proficiency level (e.g. "Beginner (approx. HSK 1)").

${modeInstruction(mode, questionCount)}

Generate exactly ${questionCount} questions appropriate for that level.

${
  mode === "reading"
    ? `For each writing_task: put the reading passage in "passage", the task instructions (including any length requirement, e.g. "Write a reply of about 150 characters") in "prompt", and a model/sample answer in "answer" so a grader has something to compare against.`
    : ""
}

Respond with ONLY valid JSON (no markdown, no code fences, no explanation, nothing before or
after the object). Escape any double-quote or backslash characters that appear inside a string
value (e.g. \\" ) so the JSON stays valid. Match exactly this shape:
{
  "level": "<short level description>",
  "questions": [
    {
      "type": ${allowedTypes.map((t) => `"${t}"`).join(" | ")},
      "prompt": "<question text, or task instructions for writing_task>",
      "options": ["<exactly 4 options, ONLY for multiple_choice>"],
      "answer": "<the correct answer, or a model answer for writing_task>",
      "passage": "<reading passage text, ONLY for writing_task>",
      "targetLength": "<e.g. '150 characters', ONLY for writing_task, omit if not specified>"
    }
  ]
}`;

  const ATTEMPTS = 2;
  let lastError = new Error("Couldn't generate the exam — please try again.");

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const result = await callGemini(prompt, {
      maxOutputTokens: 16_000,
      timeoutMs: 100_000,
    });
    if (!result.ok) {
      lastError = new Error(result.error);
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonObject(result.text));
    } catch (err) {
      console.error(`Failed to parse generated exam JSON (attempt ${attempt}/${ATTEMPTS}):`, err, result.text);
      lastError = new Error("Gemini's response couldn't be parsed as JSON — try generating again.");
      continue;
    }

    const level = (parsed as { level?: unknown })?.level;
    const questionsRaw = (parsed as { questions?: unknown })?.questions;
    if (typeof level !== "string" || !Array.isArray(questionsRaw)) {
      console.error(`Generated exam had unexpected shape (attempt ${attempt}/${ATTEMPTS}):`, result.text);
      lastError = new Error("Gemini's response wasn't in the expected format — try generating again.");
      continue;
    }

    const questions = questionsRaw.filter((q: unknown): q is ExamQuestion => isValidQuestion(q, allowedTypes));
    if (questions.length === 0) {
      console.error(`Generated exam had no valid questions for mode ${mode} (attempt ${attempt}/${ATTEMPTS}):`, result.text);
      lastError = new Error("Gemini didn't return any usable questions for this mode — try generating again.");
      continue;
    }

    return { level, questions, markingCriteria: markingCriteria?.trim() || undefined };
  }

  throw lastError;
}
