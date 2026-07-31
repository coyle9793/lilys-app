import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gradeWriting } from "@/lib/ai/gradeWriting";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const passage = typeof body?.passage === "string" ? body.passage : "";
  const taskPrompt = typeof body?.taskPrompt === "string" ? body.taskPrompt : "";
  const studentResponse = typeof body?.studentResponse === "string" ? body.studentResponse : "";
  const markingCriteria =
    typeof body?.markingCriteria === "string" ? body.markingCriteria : undefined;

  if (!taskPrompt || !studentResponse.trim()) {
    return NextResponse.json({ error: "Missing task or response" }, { status: 400 });
  }

  try {
    const result = await gradeWriting(passage, taskPrompt, studentResponse, markingCriteria);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't get feedback — please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
