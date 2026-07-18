import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingInputSchema, ONBOARDING_DATA_VERSION } from "@/lib/onboarding";

async function context() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; }

export async function GET() {
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [{ data: settings, error }, { data: state }] = await Promise.all([
    supabase.from("awaken_user_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("awaken_states").select("user_id,state").eq("user_id", user.id).maybeSingle()
  ]);
  const embedded = (state?.state as { onboardingSettings?: unknown } | null)?.onboardingSettings ?? null;
  if (error || settings?.onboarding_status !== "complete") return NextResponse.json({ settings: embedded, hasProgress: Boolean(state), email: user.email ?? "" });
  return NextResponse.json({ settings: fromRow(settings), hasProgress: Boolean(state), email: user.email ?? "" });
}

export async function PUT(request: Request) {
  const raw = await request.json().catch(() => null);
  const parsed = onboardingInputSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings." }, { status: 400 });
  const { supabase, user } = await context();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const row = toRow(user.id, parsed.data, String(raw?.notificationPermission ?? "default"));
  const { data, error } = await supabase.from("awaken_user_settings").upsert(row).select("*").single();
  if (error) {
    const { data: cloud } = await supabase.from("awaken_states").select("state,revision").eq("user_id", user.id).maybeSingle();
    if (!cloud) return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
    const currentState = cloud.state as Record<string, unknown>;
    const currentProfile = (currentState.profile ?? {}) as Record<string, unknown>;
    const nextState = { ...currentState, profile: { ...currentProfile, displayName: parsed.data.displayName, mainArcId: parsed.data.mainArcId, arcThemeId: parsed.data.arcThemeId }, onboardingSettings: { ...parsed.data, onboardingStatus: "complete", onboardingCompletedAt: new Date().toISOString(), onboardingDataVersion: ONBOARDING_DATA_VERSION } };
    const { error: saveError } = await supabase.rpc("save_awaken_state", { p_state: nextState, p_expected_revision: cloud.revision, p_operation_id: crypto.randomUUID(), p_data_version: 4 });
    if (saveError) return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
    return NextResponse.json({ settings: nextState.onboardingSettings, reloadRequired: true });
  }
  await supabase.from("user_profiles").update({ display_name: parsed.data.displayName, main_arc_id: parsed.data.mainArcId, arc_theme_id: parsed.data.arcThemeId }).eq("user_id", user.id);
  return NextResponse.json({ settings: fromRow(data) });
}

export function toRow(userId: string, value: ReturnType<typeof onboardingInputSchema.parse>, permission = "default") {
  return { user_id: userId, onboarding_status: "complete", onboarding_data_version: ONBOARDING_DATA_VERSION, display_name: value.displayName, primary_goal: value.primaryGoal, motivation: value.motivation, target_timeframe: value.targetTimeframe, preset_id: value.presetId, main_arc_id: value.mainArcId, arc_theme_id: value.arcThemeId, prioritized_categories: value.categories, difficulty: value.difficulty, daily_reset_time: value.dailyResetTime, time_zone: value.timeZone, active_days: value.activeDays, reminders_enabled: value.remindersEnabled, reminder_times: value.reminderTimes, reminder_types: value.reminderTypes, preferred_tasks: value.tasks, appearance: { theme: value.theme }, notification_permission: permission, updated_at: new Date().toISOString() };
}
function fromRow(row: Record<string, unknown>) { return { onboardingStatus: row.onboarding_status, onboardingCompletedAt: row.onboarding_completed_at, onboardingDataVersion: row.onboarding_data_version, displayName: row.display_name, primaryGoal: row.primary_goal, motivation: row.motivation, targetTimeframe: row.target_timeframe, presetId: row.preset_id, mainArcId: row.main_arc_id, arcThemeId: row.arc_theme_id, categories: row.prioritized_categories, tasks: row.preferred_tasks, difficulty: row.difficulty, dailyResetTime: String(row.daily_reset_time).slice(0,5), timeZone: row.time_zone, activeDays: row.active_days, remindersEnabled: row.reminders_enabled, reminderTimes: row.reminder_times, reminderTypes: row.reminder_types, theme: (row.appearance as {theme?: string})?.theme ?? "minimal", notificationPermission: row.notification_permission };
}
