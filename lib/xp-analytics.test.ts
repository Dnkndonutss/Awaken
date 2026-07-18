import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "@/hooks/use-awaken-state";
import type { StatCategory, XPLogEntry } from "@/types/awaken";
import { buildXpProgressSeries } from "./xp-analytics";

function xpEvent(id: string, date: string, amount: number, stat: StatCategory, sourceType: XPLogEntry["sourceType"] = "positive_task"): ActivityEvent {
  return {
    id,
    name: id,
    kind: "xp",
    result: {
      xpChanged: amount,
      affectedStat: stat,
      oldStatLevel: 0,
      newStatLevel: 0,
      leveledUp: false,
      leveledDown: false,
      updatedOverallXp: Math.max(0, amount),
      updatedOverallLevel: 0,
      updatedRankId: "bronze",
      logEntry: { id, createdAt: `${date}T12:00:00.000Z`, stat, xpAmount: amount, sourceType },
      updatedProfile: { id: "owner", displayName: "Owner", mainArcId: "warrior", arcThemeId: "minimal", disciplineTierId: "untrained", disciplineXp: 0, overallXp: 0, overallLevel: 0, rankId: "bronze", stats: [], createdAt: `${date}T12:00:00.000Z` }
    }
  };
}

const base = { today: "2026-07-17", timeZone: "UTC", range: 7 as const, mode: "daily" as const };

describe("XP analytics aggregation", () => {
  it("groups gains, losses, tasks, and affected stats by date", () => {
    const result = buildXpProgressSeries({ ...base, metric: "net", activityLog: [
      xpEvent("gain", "2026-07-17", 80, "strength"),
      xpEvent("loss", "2026-07-17", -30, "vitality", "negative_action")
    ] });
    const today = result.points.at(-1)!;
    expect(today).toMatchObject({ xpGained: 80, xpLost: 30, netXp: 50, completedTasks: 1, value: 50 });
    expect(today.affectedStats).toEqual(["strength", "vitality"]);
  });

  it("limits fixed ranges and fills missing days", () => {
    const result = buildXpProgressSeries({ ...base, metric: "total", activityLog: [
      xpEvent("inside", "2026-07-15", 50, "strength"),
      xpEvent("outside", "2026-07-01", 500, "strength")
    ] });
    expect(result.points).toHaveLength(7);
    expect(result.points.reduce((sum, point) => sum + point.value, 0)).toBe(50);
  });

  it("supports 30-day, 90-day, and all-time ranges", () => {
    const events = [xpEvent("old", "2026-01-01", 10, "wealth")];
    expect(buildXpProgressSeries({ ...base, range: 30, metric: "total", activityLog: [] }).points).toHaveLength(30);
    expect(buildXpProgressSeries({ ...base, range: 90, metric: "total", activityLog: [] }).points).toHaveLength(90);
    expect(buildXpProgressSeries({ ...base, range: "all", metric: "total", activityLog: events }).points[0].date).toBe("2026-01-01");
  });

  it("filters the plotted value to one stat", () => {
    const result = buildXpProgressSeries({ ...base, metric: "intelligence", activityLog: [
      xpEvent("str", "2026-07-17", 80, "strength"),
      xpEvent("int", "2026-07-17", 60, "intelligence")
    ] });
    expect(result.points.at(-1)?.value).toBe(60);
  });

  it("plots penalties below zero in net mode", () => {
    const result = buildXpProgressSeries({ ...base, metric: "net", activityLog: [xpEvent("loss", "2026-07-17", -45, "charisma", "negative_action")] });
    expect(result.points.at(-1)?.value).toBe(-45);
  });

  it("accumulates the selected metric over time", () => {
    const result = buildXpProgressSeries({ ...base, mode: "cumulative", metric: "net", activityLog: [
      xpEvent("one", "2026-07-16", 100, "strength"),
      xpEvent("two", "2026-07-17", -25, "strength", "negative_action")
    ] });
    expect(result.points.slice(-2).map((point) => point.value)).toEqual([100, 75]);
  });

  it("returns a useful empty result when no XP exists", () => {
    const result = buildXpProgressSeries({ ...base, metric: "total", activityLog: [] });
    expect(result.hasActivity).toBe(false);
    expect(result.activeDayCount).toBe(0);
  });

  it("does not retain another owner's activity between calls", () => {
    const firstOwner = buildXpProgressSeries({ ...base, metric: "total", activityLog: [xpEvent("owner-one", "2026-07-17", 100, "strength")] });
    const secondOwner = buildXpProgressSeries({ ...base, metric: "total", activityLog: [xpEvent("owner-two", "2026-07-17", 25, "wealth")] });
    expect(firstOwner.points.at(-1)?.value).toBe(100);
    expect(secondOwner.points.at(-1)?.value).toBe(25);
  });
});
