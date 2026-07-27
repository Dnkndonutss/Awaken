import { describe, expect, it } from "vitest";
import { createStarterState } from "@/hooks/use-awaken-state";
import {
  applyRankMasteryProgression,
  getRankMasteryProgress
} from "@/lib/rank-mastery";

describe("rank mastery progression", () => {
  it("promotes Silver automatically at Level 12", () => {
    const state = createStarterState();
    const promoted = applyRankMasteryProgression({
      ...state,
      profile: { ...state.profile, overallLevel: 12 }
    });

    expect(promoted.profile.rankId).toBe("silver");
    expect(promoted.rankMastery.earnedRankIds).toContain("silver");
  });

  it("holds Gold until every mastery requirement is complete", () => {
    const state = createStarterState();
    const eligible = {
      ...state,
      profile: {
        ...state.profile,
        overallLevel: 28,
        rankId: "silver" as const,
        stats: state.profile.stats.map((stat, index) => ({
          ...stat,
          currentXp: index < 3 ? 100 : 0
        }))
      },
      weeklyReports: state.weeklyReports.map((report) => ({
        ...report,
        dailyQuestsCompleted: 20
      })),
      rankMastery: { ...state.rankMastery, earnedRankIds: ["bronze" as const, "silver" as const] }
    };

    expect(getRankMasteryProgress(eligible).requirementsComplete).toBe(false);
    expect(applyRankMasteryProgression(eligible).profile.rankId).toBe("silver");

    const defeatedBoss = { ...state.activeBoss, id: "defeated-1", status: "defeated" as const };
    const promoted = applyRankMasteryProgression({ ...eligible, bossHistory: [defeatedBoss] });
    expect(promoted.profile.rankId).toBe("gold");
  });

  it("never removes an earned rank when XP or level falls", () => {
    const state = createStarterState();
    const earnedGold = {
      ...state,
      profile: { ...state.profile, overallLevel: 1, rankId: "gold" as const },
      rankMastery: {
        ...state.rankMastery,
        earnedRankIds: ["bronze" as const, "silver" as const, "gold" as const]
      }
    };

    expect(applyRankMasteryProgression(earnedGold).profile.rankId).toBe("gold");
  });
});
