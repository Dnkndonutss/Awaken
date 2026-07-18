import { describe, expect, it } from "vitest";
import { createBackup, CURRENT_DATA_VERSION, migrateState, parseBackup } from "./schema";

const state = { profile: { id: "p", displayName: "Hunter", stats: [] }, activityLog: [], customPositiveTasks: [], customNegativeActions: [], dailyQuests: [], bossHistory: [], dailyReviews: [], dailyInsights: [], weeklyReports: [], weeklyReflections: [] };

describe("Awaken serialized data", () => {
  it("migrates a supported legacy state deterministically", () => expect(migrateState(state, 2).profile.displayName).toBe("Hunter"));
  it("rejects malformed state", () => expect(() => migrateState({ activityLog: [] })).toThrow(/malformed/));
  it("rejects future versions", () => expect(() => migrateState(state, CURRENT_DATA_VERSION + 1)).toThrow(/newer/));
  it("round-trips a versioned export", () => { const backup = createBackup(state as never); expect(parseBackup(JSON.parse(JSON.stringify(backup))).dataVersion).toBe(CURRENT_DATA_VERSION); });
  it("rejects non-Awaken exports", () => expect(() => parseBackup({ format: "other" })).toThrow());
});
