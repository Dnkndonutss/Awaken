import { describe, expect, it } from "vitest";
import { PRESET_POSITIVE_TASKS } from "@/data/awaken-constants";
import { applyUrlActionToState, createStarterState } from "@/hooks/use-awaken-state";

function params(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null };
}

describe("linked task quest rewards", () => {
  it("awards the displayed quest reward once when its linked task is logged", () => {
    const state = createStarterState();
    const quest = state.dailyQuests[0];
    expect(quest?.linkedTaskId).toBeTruthy();

    const task = PRESET_POSITIVE_TASKS.find((item) => item.id === quest?.linkedTaskId);
    expect(task).toBeDefined();
    if (!quest || !task) return;

    const completed = applyUrlActionToState(
      state,
      "positive",
      params({ actionId: task.id })
    );

    expect(completed.profile.overallXp - state.profile.overallXp).toBe(quest.xpReward);
    expect(completed.dailyQuests.find((item) => item.id === quest.id)?.completed).toBe(true);
    const rewardEvent = completed.activityLog.find((event) => event.kind === "xp");
    expect(rewardEvent?.kind === "xp" ? rewardEvent.result.logEntry.sourceId : undefined).toBe(quest.id);

    const repeated = applyUrlActionToState(
      completed,
      "positive",
      params({ actionId: task.id })
    );

    expect(repeated.profile.overallXp - completed.profile.overallXp).toBe(task.baseXp);
  });
});
