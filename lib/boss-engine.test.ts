import { describe, expect, it } from "vitest";
import { STAT_CATEGORIES } from "@/data/awaken-constants";
import { selectWeeklyBossDefinition, WEEKLY_BOSS_ROSTER } from "@/lib/boss-engine";

describe("weekly boss roster", () => {
  it("contains five unique bosses for every stat", () => {
    const allBosses = STAT_CATEGORIES.flatMap((stat) => WEEKLY_BOSS_ROSTER[stat]);

    expect(allBosses).toHaveLength(25);
    expect(new Set(allBosses.map((boss) => boss.id)).size).toBe(25);
    expect(new Set(allBosses.map((boss) => boss.name)).size).toBe(25);

    for (const stat of STAT_CATEGORIES) {
      expect(WEEKLY_BOSS_ROSTER[stat]).toHaveLength(5);
    }
  });

  it("rotates through the category roster on consecutive weeks", () => {
    const weeks = [
      "2026-07-13",
      "2026-07-20",
      "2026-07-27",
      "2026-08-03",
      "2026-08-10"
    ];
    const bosses = weeks.map((week) =>
      selectWeeklyBossDefinition("strength", "personal-profile", week).id
    );

    expect(new Set(bosses).size).toBe(5);
  });

  it("keeps selection stable for the same account and week", () => {
    const first = selectWeeklyBossDefinition("wealth", "personal-profile", "2026-07-13");
    const second = selectWeeklyBossDefinition("wealth", "personal-profile", "2026-07-13");

    expect(second).toEqual(first);
  });
});
