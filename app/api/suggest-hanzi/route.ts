import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestHanzi } from "@/lib/dictionary/reversePinyin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const pinyin = typeof body?.pinyin === "string" ? body.pinyin : "";
  if (!pinyin) return NextResponse.json({ hanzi: null });

  return NextResponse.json({ hanzi: suggestHanzi(pinyin) });
}
