import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDeckWithCards } from "@/lib/queries";
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
  const deckId = typeof body?.deckId === "string" ? body.deckId : "";
  const questionCount = Number(body?.questionCount) || 10;
  const mode: ExamMode = VALID_MODES.includes(body?.mode) ? body.mode : "questions";
  const exampleFormatText =
    typeof body?.exampleFormatText === "string" ? body.exampleFormatText : undefined;
  const markingCriteria =
    typeof body?.markingCriteria === "string" ? body.markingCriteria : undefined;
  if (!deckId) return NextResponse.json({ error: "Missing deckId" }, { status: 400 });

  const result = await getDeckWithCards(supabase, deckId);
  if (!result || result.deck.user_id !== user.id) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
  if (result.cards.length === 0) {
    return NextResponse.json({ error: "This deck has no cards to generate an exam from." }, { status: 400 });
  }

  // Each "reading" question is a full passage + reply task, so keep the count small.
  const maxCount = mode === "reading" ? 5 : 30;

  const exam = await generateExam(
    result.cards,
    Math.min(Math.max(questionCount, 1), maxCount),
    mode,
    exampleFormatText,
    markingCriteria,
  );
  if (!exam) {
    return NextResponse.json(
      { error: "Couldn't generate the exam — please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json(exam);
}
