import { callGemini } from "./gemini";
import type { Card } from "@/lib/types";

export type ExamQuestionType =
  | "multiple_choice"
  | "translate_to_english"
  | "translate_to_chinese"
  | "fill_in_blank"
  | "short_answer";

export interface ExamQuestion {
  type: ExamQuestionType;
  prompt: string;
  options?: string[];
  answer: string;
}

export interface GeneratedExam {
  level: string;
  questions: ExamQuestion[];
}

const MAX_VOCAB_CARDS = 150;

function stripCodeFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced ? fenced[1] : text;
}

function isValidQuestion(q: unknown): q is ExamQuestion {
  if (typeof q !== "object" || q === null) return false;
  const question = q as Record<string, unknown>;
  const validTypes: ExamQuestionType[] = [
    "multiple_choice",
    "translate_to_english",
    "translate_to_chinese",
    "fill_in_blank",
    "short_answer",
  ];
  if (!validTypes.includes(question.type as ExamQuestionType)) return false;
  if (typeof question.prompt !== "string" || !question.prompt.trim()) return false;
  if (typeof question.answer !== "string" || !question.answer.trim()) return false;
  if (question.type === "multiple_choice") {
    if (!Array.isArray(question.options) || question.options.length < 2) return false;
    if (!question.options.every((o) => typeof o === "string")) return false;
  }
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
): Promise<GeneratedExam | null> {
  const vocabList = cards
    .slice(0, MAX_VOCAB_CARDS)
    .map((c) => `${c.hanzi} | ${c.pinyin} | ${c.definition}`)
    .join("\n");

  const formatSection = exampleFormatText?.trim()
    ? `Here is an example of the exam question format/style to match:\n"""\n${exampleFormatText.trim().slice(0, 4000)}\n"""\nGenerate new questions in a similar style and structure to this example, but do not reuse its exact content — write fresh questions using only the vocabulary below.`
    : "No example format was given — use a natural mix of question types appropriate for a language exam.";

  const prompt = `You are creating a Chinese language exam for a student, based only on vocabulary they have studied.

Vocabulary the student has studied (Hanzi | Pinyin | English):
${vocabList}

${formatSection}

Based on the vocabulary above, estimate the student's approximate proficiency level (e.g. "Beginner (approx. HSK 1)") and generate exactly ${questionCount} exam questions that test ONLY this vocabulary, appropriate for that level. Use a sensible mix of question types.

Respond with ONLY valid JSON (no markdown, no code fences, no explanation) matching exactly this shape:
{
  "level": "<short level description>",
  "questions": [
    {
      "type": "multiple_choice" | "translate_to_english" | "translate_to_chinese" | "fill_in_blank" | "short_answer",
      "prompt": "<question text>",
      "options": ["<exactly 4 options, ONLY for multiple_choice>"],
      "answer": "<the correct answer>"
    }
  ]
}`;

  const raw = await callGemini(prompt, { maxOutputTokens: 4000 });
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
    return { level: parsed.level, questions };
  } catch (err) {
    console.error("Failed to parse generated exam JSON:", err, raw);
    return null;
  }
}
