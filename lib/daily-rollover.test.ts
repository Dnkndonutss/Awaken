import { describe, expect, it } from "vitest";
import { createStarterState, rollDailyQuestsToDate } from "@/hooks/use-awaken-state";

describe("daily quest rollover", () => {
  it("creates a fresh dated quest set and clears daily milestones", () => {
    const state = {
      ...createStarterState(),
      awardedQuestBonusMilestones: [4, 5]
    };
    const next = rollDailyQuestsToDate(state, "2030-05-21");

    expect(next).not.toBe(state);
    expect(next.questDate).toBe("2030-05-21");
    expect(next.dailyQuests).toHaveLength(5);
    expect(next.dailyQuests.every((quest) => quest.date === "2030-05-21")).toBe(true);
    expect(next.awardedQuestBonusMilestones).toEqual([]);
  });

  it("does nothing when the current daily set is already active", () => {
    const state = createStarterState();
    expect(rollDailyQuestsToDate(state, state.questDate)).toBe(state);
  });
});
