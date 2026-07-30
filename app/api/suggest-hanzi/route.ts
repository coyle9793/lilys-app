import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHanzi } from "@/lib/dictionary/reversePinyin";
import { suggestHanziWithGemini } from "@/lib/ai/geminiHanzi";

const HAN_CHAR = /\p{Script=Han}/u;
const LATIN_LETTER = /[a-zA-Z]/;

/** Rejects AI responses that aren't actually Hanzi (e.g. the model echoing pinyin back). */
function isPlausibleHanzi(text: string): boolean {
  return HAN_CHAR.test(text) && !LATIN_LETTER.test(text);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const pinyin = typeof body?.pinyin === "string" ? body.pinyin : "";
  const translation = typeof body?.translation === "string" ? body.translation : "";
  if (!pinyin) return NextResponse.json({ hanzi: null, source: null });

  const aiGuessRaw = translation ? await suggestHanziWithGemini(pinyin, translation) : null;
  const aiGuess = aiGuessRaw?.trim() ?? null;
  if (aiGuess && isPlausibleHanzi(aiGuess)) {
    return NextResponse.json({ hanzi: aiGuess, source: "ai" });
  }

  return NextResponse.json({ hanzi: suggestHanzi(pinyin), source: "dictionary" });
}
