import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canReplaceStateForOnboarding, onboardingInputSchema, toOnboardingSettingsRow } from "@/lib/onboarding";
import { initialTutorialProgress } from "@/lib/tutorial";

const schema = z.object({ settings: onboardingInputSchema, state: z.record(z.string(), z.unknown()), operationId: z.string().uuid(), dataVersion: z.number().int().positive() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid onboarding data." }, { status: 400 });
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = parsed.data.state.profile as Record<string, unknown> | undefined;
  if (profile?.displayName !== parsed.data.settings.displayName || profile?.mainArcId !== parsed.data.settings.mainArcId) return NextResponse.json({ error: "Profile does not match onboarding choices." }, { status: 400 });
  const tutorial = initialTutorialProgress();
  const state = { ...parsed.data.state, onboardingSettings: { ...parsed.data.settings, onboardingStatus: "complete", onboardingCompletedAt: new Date().toISOString(), onboardingDataVersion: 1 }, tutorial };
  const [{ data: current }, { data: existingSettings }] = await Promise.all([
    supabase.from("awaken_states").select("state,revision").eq("user_id", user.id).maybeSingle(),
    supabase.from("awaken_user_settings").select("onboarding_status").eq("user_id", user.id).maybeSingle()
  ]);
  if (existingSettings?.onboarding_status === "complete" && current) {
    return NextResponse.json({ state: current.state, revision: current.revision, settings: state.onboardingSettings });
  }
  const pristineStarter = Boolean(current && canReplaceStateForOnboarding(current.state));
  if (current && !pristineStarter) {
    const savedProfile = (current.state as { profile?: Record<string, unknown> }).profile;
    const now = new Date().toISOString();
    const { error: repairError } = await supabase.from("awaken_user_settings").upsert({
      user_id: user.id,
      onboarding_status: "complete",
      onboarding_completed_at: now,
      display_name: typeof savedProfile?.displayName === "string" ? savedProfile.displayName : "Player",
      main_arc_id: typeof savedProfile?.mainArcId === "string" ? savedProfile.mainArcId : "creator",
      arc_theme_id: typeof savedProfile?.arcThemeId === "string" ? savedProfile.arcThemeId : "minimal",
      primary_goal: "Continue existing Awaken progress",
      updated_at: now
    });
    if (repairError) return NextResponse.json({ error: "Unable to repair onboarding status." }, { status: 500 });
    return NextResponse.json({ state: current.state, revision: current.revision, settings: state.onboardingSettings });
  }

  const settingsRow = toOnboardingSettingsRow(user.id, parsed.data.settings);
  const settingsPayload: Record<string, unknown> = { ...settingsRow };
  delete settingsPayload.user_id;
  const result = current
    ? await supabase.rpc("restore_awaken_state", { p_state: state, p_operation_id: parsed.data.operationId, p_data_version: parsed.data.dataVersion })
    : await supabase.rpc("complete_awaken_onboarding", { p_settings: settingsPayload, p_state: state, p_operation_id: parsed.data.operationId, p_data_version: parsed.data.dataVersion });
  if (result.error || !result.data?.[0]) return NextResponse.json({ error: `Unable to create your Awaken profile${result.error?.code ? ` (${result.error.code})` : ""}.` }, { status: 500 });

  if (current) {
    const { error: settingsError } = await supabase.from("awaken_user_settings").upsert(settingsRow);
    if (settingsError) return NextResponse.json({ error: "Your profile was created, but its onboarding status could not be saved." }, { status: 500 });
  }

  // Tutorial progress shares the same owner-scoped snapshot and cannot be overwritten by preference projections.
  return NextResponse.json({ state: result.data[0].state, revision: result.data[0].revision, settings: state.onboardingSettings });
}
