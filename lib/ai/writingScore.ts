/**
 * Shared, client-safe types/helpers for UK-university-style writing marks
 * (0-100, banded into UK degree classifications). Kept separate from
 * gradeWriting.ts so client components can import it without pulling in
 * the Gemini API caller (which reads server-only env vars).
 */

export interface WritingFeedback {
  /** Overall mark out of 100 — the average of the 5 category scores below. */
  score: number;
  /** UK classification band for the overall score, e.g. "2:1 (lower)". */
  classification: string;
  scores: {
    content: number;
    coherence: number;
    language: number;
    accuracy: number;
    characters: number;
  };
  feedback: string;
}

export function classifyMark(score: number): string {
  if (score >= 70) return "1st class";
  if (score >= 65) return "2:1 (upper)";
  if (score >= 60) return "2:1 (lower)";
  if (score >= 55) return "2:2 (upper)";
  if (score >= 50) return "2:2 (lower)";
  if (score >= 45) return "3rd (upper)";
  if (score >= 40) return "3rd";
  return "Fail";
}
