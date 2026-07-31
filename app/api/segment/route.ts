import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentAndLookup } from "@/lib/dictionary/segment";
import { extractPinyinSentencePairs } from "@/lib/dictionary/pinyinSentences";
import { extractHanziSentences } from "@/lib/dictionary/hanziSentences";

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
  const pinyinSentences = extractPinyinSentencePairs(text).map((pair) => ({
    hanzi: pair.source,
    pinyin: pair.source,
    definitions: [pair.translation],
    found: true,
  }));

  // Slides that lay out full example sentences (English translation, then the
  // Hanzi sentence, then its pinyin) would otherwise only surface as the
  // individual dictionary words above — add the whole sentence as its own
  // card too, so it can be studied as a sentence, not just shredded vocab.
  const hanziSentences = extractHanziSentences(text).map((sentence) => ({
    hanzi: sentence.hanzi,
    pinyin: sentence.pinyin,
    definitions: [sentence.translation],
    found: true,
  }));

  return NextResponse.json({ words: [...words, ...pinyinSentences, ...hanziSentences] });
}
