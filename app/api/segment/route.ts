import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentAndLookup } from "@/lib/dictionary/segment";

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
  return NextResponse.json({ words });
}
