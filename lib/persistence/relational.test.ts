import { describe, expect, it } from "vitest";
import type { ActivityEvent, AwakenState } from "@/hooks/use-awaken-state";
import { deriveStatProgress, projectRelationalState, projectXpLedger } from "./relational";

function xpEvent(id: string, amount: number, sourceId: string): Extract<ActivityEvent, { kind: "xp" }> {
  return {
    id, name: id, kind: "xp",
    result: {
      xpChanged: amount, affectedStat: "strength", oldStatLevel: 0, newStatLevel: 0,
      leveledUp: false, leveledDown: false, updatedOverallXp: Math.max(0, amount), updatedOverallLevel: 0, updatedRankId: "bronze",
      logEntry: { id, createdAt: "2026-07-15T00:00:00.000Z", stat: "strength", xpAmount: amount, sourceType: "manual_adjustment", sourceId },
      updatedProfile: { id: "p", displayName: "Player", mainArcId: "warrior", arcThemeId: "minimal", disciplineTierId: "untrained", disciplineXp: 0, overallXp: Math.max(0, amount), overallLevel: 0, rankId: "bronze", stats: [], createdAt: "2026-07-15T00:00:00.000Z" }
    }
  };
}

describe("relational state projection", () => {
  it("deduplicates retried XP events", () => expect(projectXpLedger([xpEvent("one", 100, "quest-1"), xpEvent("one", 100, "quest-1")])).toHaveLength(1));
  it("links a compensating reversal without editing history", () => {
    const ledger = projectXpLedger([xpEvent("undo", -100, "quest-1-undo"), xpEvent("award", 100, "quest-1")]);
    expect(ledger).toHaveLength(2); expect(ledger.find((event) => event.id === "undo")?.reversalOf).toBe("award");
  });
  it("rebuilds cached XP and level from the ledger", () => {
    const progress = deriveStatProgress(projectXpLedger([xpEvent("a", 400, "a"), xpEvent("b", -50, "b")]));
    expect(progress.strength).toEqual({ currentXp: 350, level: 1 });
  });
  it("projects task, quest, and boss records deterministically", () => {
    const base = xpEvent("task-complete", 100, "task-1"); base.result.logEntry.sourceType = "positive_task";
    const boss: ActivityEvent = { id: "boss-1", name: "Boss", kind: "boss", message: "Hit", combatType: "damage", hpAmount: 35, createdAt: "2026-07-15T00:00:00.000Z" };
    const state = { activityLog: [base,boss], dailyQuests: [{ id: "q", completed: true }] } as unknown as AwakenState;
    const projection = projectRelationalState(state);
    expect(projection.taskCompletionIds).toEqual(["task-complete"]); expect(projection.completedQuestIds).toEqual(["q"]); expect(projection.bossActivityIds).toEqual(["boss-1"]);
  });
});
