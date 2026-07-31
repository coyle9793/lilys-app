import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDecksWithCardsByIds } from "@/lib/queries";
import { generateExam, type ExamMode } from "@/lib/ai/examGenerator";
import { hasGeminiKey } from "@/lib/ai/gemini";

const VALID_MODES: ExamMode[] = ["questions", "multiple_choice", "reading"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "Exam generation needs a free Gemini API key — see the README for setup." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const deckIds: string[] = Array.isArray(body?.deckIds)
    ? body.deckIds.filter((id: unknown): id is string => typeof id === "string")
    : [];
  const questionCount = Number(body?.questionCount) || 10;
  const mode: ExamMode = VALID_MODES.includes(body?.mode) ? body.mode : "questions";
  const exampleFormatText =
    typeof body?.exampleFormatText === "string" ? body.exampleFormatText : undefined;
  const markingCriteria =
    typeof body?.markingCriteria === "string" ? body.markingCriteria : undefined;
  if (deckIds.length === 0) return NextResponse.json({ error: "Missing deckIds" }, { status: 400 });

  const { decks, cards } = await getDecksWithCardsByIds(supabase, deckIds, user.id);
  if (decks.length === 0) {
    return NextResponse.json({ error: "Deck(s) not found" }, { status: 404 });
  }
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "The selected deck(s) have no cards to generate an exam from." },
      { status: 400 },
    );
  }

  // Each "reading" question is a full passage + reply task, so keep the count small.
  const maxCount = mode === "reading" ? 5 : 30;

  try {
    const exam = await generateExam(
      cards,
      Math.min(Math.max(questionCount, 1), maxCount),
      mode,
      exampleFormatText,
      markingCriteria,
    );
    return NextResponse.json(exam);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't generate the exam — please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
