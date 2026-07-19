import { describe, expect, it } from "vitest";
import { ARC_THEMES } from "@/data/awaken-constants";
import { buildCelebrations, type CelebrationSnapshot } from "@/components/AwakenCelebrations";
import type { DailyQuest, WeeklyBoss } from "@/types/awaken";

const quest: DailyQuest = {
  id: "2026-07-17-main-strength-workout",
  date: "2026-07-17",
  title: "Main Quest",
  description: "Complete a workout.",
  linkedTaskId: "strength-workout",
  targetStat: "strength",
  xpReward: 105,
  questType: "main",
  sourceTaskIds: ["strength-workout"],
  completed: false
};

const boss: WeeklyBoss = {
  id: "weekly-strength-boss",
  name: "Iron Warden",
  description: "Break it with consistent action.",
  maxHp: 120,
  currentHp: 35,
  targetStat: "strength",
  weekStartDate: "2026-07-13",
  weekEndDate: "2026-07-19",
  damageTaskIds: ["strength-workout"],
  healingNegativeActionIds: ["skip-workout"],
  status: "active",
  rewards: { statXp: 140, disciplineXp: 75, titleUnlock: "Iron Breaker" },
  rewardsClaimed: false
};

describe("celebration queue", () => {
  it("queues quest, boss, and level celebrations without overlap", () => {
    const previous: CelebrationSnapshot = { level: 0, quests: [quest], boss };
    const current: CelebrationSnapshot = {
      level: 1,
      quests: [{ ...quest, completed: true, completedAt: "2026-07-17T12:00:00.000Z" }],
      boss: { ...boss, currentHp: 0, status: "defeated", rewardsClaimed: true }
    };
    const theme = ARC_THEMES.find((item) => item.id === "minimal");
    expect(theme).toBeDefined();
    if (!theme) return;

    const celebrations = buildCelebrations(previous, current, theme);

    expect(celebrations.map((item) => item.kind)).toEqual([
      "quest",
      "boss",
      "level"
    ]);
    expect(new Set(celebrations.map((item) => item.id)).size).toBe(celebrations.length);
  });
});
