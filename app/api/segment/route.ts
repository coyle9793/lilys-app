import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentAndLookup } from "@/lib/dictionary/segment";
import { extractPinyinSentencePairs } from "@/lib/dictionary/pinyinSentences";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text) return NextResponse.json({ words: [] });

  const words = segmentAndLookup(text);

  // Some study material (e.g. Q&A drill sheets) gives pinyin sentences with an
  // English translation but no Hanzi at all, so it produces no dictionary hits.
  // Pull those out as their own sentence-level flashcards.
  const sentences = extractPinyinSentencePairs(text).map((pair) => ({
    hanzi: pair.source,
    pinyin: pair.source,
    definitions: [pair.translation],
    found: true,
  }));

  return NextResponse.json({ words: [...words, ...sentences] });
}
