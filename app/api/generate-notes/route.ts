import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateNotes } from "@/lib/ai/notesGenerator";
import { hasGeminiKey } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!hasGeminiKey()) {
    return NextResponse.json(
      { error: "Generating notes needs a free Gemini API key — see the README for setup." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  const title = typeof body?.title === "string" && body.title.trim() ? body.title : "these slides";
  if (!text.trim()) return NextResponse.json({ error: "No text to generate notes from." }, { status: 400 });

  try {
    const notes = await generateNotes(text, title);
    return NextResponse.json({ notes });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't generate notes — please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
