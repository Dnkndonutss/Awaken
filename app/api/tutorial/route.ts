import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { finishTutorial, initialTutorialProgress, moveTutorial, TUTORIAL_STEPS, TUTORIAL_VERSION, type TutorialProgress } from "@/lib/tutorial";

const actionSchema = z.object({ action: z.enum(["next", "back", "skip", "exit", "finish", "restart"]), operationId: z.string().uuid() });

async function context() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; }
function readProgress(state: unknown): TutorialProgress | null { const value = (state as { tutorial?: unknown } | null)?.tutorial; if (!value || typeof value !== "object") return null; const item = value as TutorialProgress; return typeof item.currentStep === "number" && item.version === TUTORIAL_VERSION ? item : null; }

export async function GET() {
  const { supabase, user } = await context(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("awaken_states").select("state").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load tutorial." }, { status: 500 });
  return NextResponse.json({ tutorial: readProgress(data?.state) });
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid tutorial update." }, { status: 400 });
  const { supabase, user } = await context(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: cloud, error } = await supabase.from("awaken_states").select("state,revision").eq("user_id", user.id).maybeSingle();
  if (error || !cloud) return NextResponse.json({ error: "Awaken progress is unavailable." }, { status: 409 });
  const current = readProgress(cloud.state);
  let tutorial = parsed.data.action === "restart" ? initialTutorialProgress() : current;
  if (!tutorial) return NextResponse.json({ error: "Tutorial is not enabled for this account. Restart it from Settings." }, { status: 409 });
  if (parsed.data.action === "next") tutorial = moveTutorial(tutorial, "next");
  if (parsed.data.action === "back") tutorial = moveTutorial(tutorial, "back");
  if (parsed.data.action === "skip") tutorial = finishTutorial(tutorial, "skipped");
  if (parsed.data.action === "exit") tutorial = finishTutorial(tutorial, "paused");
  if (parsed.data.action === "finish") tutorial = finishTutorial(tutorial, "completed");
  tutorial.currentStep = Math.min(tutorial.currentStep, TUTORIAL_STEPS.length - 1);
  const state = { ...(cloud.state as Record<string, unknown>), tutorial };
  const { data, error: saveError } = await supabase.from("awaken_states").update({state,updated_at:new Date().toISOString()}).eq("user_id",user.id).eq("revision",cloud.revision).select("revision").maybeSingle();
  if (saveError || !data) return NextResponse.json({ error: "Tutorial changed on another device. Reload to continue." }, { status: 409 });
  return NextResponse.json({ tutorial });
}
