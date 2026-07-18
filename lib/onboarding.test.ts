import { describe, expect, it } from "vitest";
import { canReplaceStateForOnboarding, defaultOnboardingDraft, onboardingInputSchema } from "./onboarding";

describe("onboarding preferences", () => {
  it("starts new users without an inherited identity or category", () => { const draft = defaultOnboardingDraft(); expect(draft.displayName).toBe(""); expect(draft.categories).toEqual([]); });
  it("requires identity, goal, and at least one priority", () => { const result = onboardingInputSchema.safeParse(defaultOnboardingDraft()); expect(result.success).toBe(false); });
  it("accepts optional fields when omitted", () => { const value = { ...defaultOnboardingDraft(), displayName: "Rin", primaryGoal: "Run a 10K", categories: ["vitality"] }; const parsed = onboardingInputSchema.parse(value); expect(parsed.motivation).toBe(""); });
  it("preserves IANA time zones and reset wall time", () => { const value = { ...defaultOnboardingDraft(), displayName: "Rin", primaryGoal: "Focus", categories: ["intelligence"], timeZone: "America/Los_Angeles", dailyResetTime: "04:30" }; expect(onboardingInputSchema.parse(value)).toMatchObject({ timeZone: "America/Los_Angeles", dailyResetTime: "04:30" }); });
  it("rejects invalid reset times and empty activity schedules", () => { const value = { ...defaultOnboardingDraft(), displayName: "Rin", primaryGoal: "Focus", categories: ["intelligence"], dailyResetTime: "25:00", activeDays: [] }; expect(onboardingInputSchema.safeParse(value).success).toBe(false); });
  it("keeps denied notifications disabled without requiring permission in the model", () => { const value = { ...defaultOnboardingDraft(), displayName: "Rin", primaryGoal: "Focus", categories: ["intelligence"], remindersEnabled: false }; expect(onboardingInputSchema.parse(value).remindersEnabled).toBe(false); });
  it("allows onboarding to replace only the obsolete pristine starter", () => {
    expect(canReplaceStateForOnboarding({ profile: { displayName: "Seeker" }, activityLog: [] })).toBe(true);
    expect(canReplaceStateForOnboarding({ profile: { displayName: "Seeker" }, activityLog: [{ id: "earned-xp" }] })).toBe(false);
    expect(canReplaceStateForOnboarding({ profile: { displayName: "Player" }, activityLog: [] })).toBe(false);
  });
});
