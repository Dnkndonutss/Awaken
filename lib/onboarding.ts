import { z } from "zod";
import { ARC_THEMES, IDEAL_BUILD_PRESETS, MAIN_ARCS, STAT_CATEGORIES } from "@/data/awaken-constants";

export const ONBOARDING_DATA_VERSION = 1;
export const difficultyIds = ["casual", "standard", "challenging", "intense"] as const;
export const reminderTypes = ["tasks", "daily_review", "unfinished_quests", "weekly_reflection"] as const;

const taskSchema = z.object({
  id: z.string().min(1).max(100), title: z.string().trim().min(1).max(100),
  kind: z.enum(["positive", "negative"]), stat: z.enum(STAT_CATEGORIES),
  xp: z.number().int().min(10).max(500), frequency: z.enum(["daily", "weekdays", "weekly", "custom"]).default("daily"),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium")
});

export const onboardingInputSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a display name.").max(80),
  primaryGoal: z.string().trim().min(1, "Enter your primary goal.").max(160),
  motivation: z.string().trim().max(1000).default(""), targetTimeframe: z.string().trim().max(80).default(""),
  presetId: z.string().refine((id) => IDEAL_BUILD_PRESETS.some((item) => item.id === id), "Choose a build."),
  mainArcId: z.string().refine((id) => MAIN_ARCS.some((item) => item.id === id)),
  arcThemeId: z.string().refine((id) => ARC_THEMES.some((item) => item.id === id)).default("minimal"),
  categories: z.array(z.enum(STAT_CATEGORIES)).min(1, "Choose at least one life category.").max(5),
  tasks: z.array(taskSchema).max(30).default([]), difficulty: z.enum(difficultyIds).default("standard"),
  dailyResetTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timeZone: z.string().trim().min(1).max(100),
  activeDays: z.array(z.number().int().min(0).max(6)).min(1), remindersEnabled: z.boolean().default(false),
  reminderTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(5).default([]),
  reminderTypes: z.array(z.enum(reminderTypes)).default([]), theme: z.string().max(40).default("minimal")
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;
export type UserSettings = OnboardingInput & { onboardingStatus: "pending" | "complete"; onboardingCompletedAt: string | null; onboardingDataVersion: number; notificationPermission: NotificationPermission | "unsupported" };

export const DIFFICULTIES = {
  casual: { label: "Casual", xp: "Standard XP", expectations: "1–2 focused quests", penalties: "Gentle penalties" },
  standard: { label: "Standard", xp: "Standard XP", expectations: "2–3 balanced quests", penalties: "Normal penalties" },
  challenging: { label: "Challenging", xp: "+10% challenge rewards", expectations: "3–4 demanding quests", penalties: "Stronger penalties" },
  intense: { label: "Intense", xp: "+20% challenge rewards", expectations: "4–5 demanding quests", penalties: "Full penalties" }
} as const;

export function defaultOnboardingDraft(): OnboardingInput {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return { displayName: "", primaryGoal: "", motivation: "", targetTimeframe: "", presetId: IDEAL_BUILD_PRESETS[0]?.id ?? "", mainArcId: IDEAL_BUILD_PRESETS[0]?.suggestedArcIds[0] ?? "creator", arcThemeId: "minimal", categories: [], tasks: [], difficulty: "standard", dailyResetTime: "04:00", timeZone: zone, activeDays: [1,2,3,4,5,6,0], remindersEnabled: false, reminderTimes: ["09:00"], reminderTypes: ["tasks"], theme: "minimal" };
}

export function canReplaceStateForOnboarding(input: unknown): boolean {
  if (!input || typeof input !== "object") return false;
  const state = input as { profile?: { displayName?: unknown }; activityLog?: unknown };
  return state.profile?.displayName === "Seeker" && Array.isArray(state.activityLog) && state.activityLog.length === 0;
}
