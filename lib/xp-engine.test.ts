import { describe, expect, it } from "vitest";
import { ARC_THEMES, RANK_THRESHOLDS } from "@/data/awaken-constants";
import { getRankIdForLevel, getXpRequiredForLevel } from "@/lib/xp-engine";

describe("rank progression", () => {
  it("uses an attainable six-rank level ladder", () => {
    expect(RANK_THRESHOLDS.map(({ id, minLevel }) => ({ id, minLevel }))).toEqual([
      { id: "bronze", minLevel: 0 },
      { id: "silver", minLevel: 3 },
      { id: "gold", minLevel: 7 },
      { id: "platinum", minLevel: 12 },
      { id: "diamond", minLevel: 18 },
      { id: "awakened", minLevel: 25 }
    ]);

    expect(RANK_THRESHOLDS.map((rank) => getXpRequiredForLevel(rank.minLevel))).toEqual([
      0,
      900,
      4_900,
      14_400,
      32_400,
      62_500
    ]);
  });

  it("promotes at each exact level boundary", () => {
    expect(getRankIdForLevel(0)).toBe("bronze");
    expect(getRankIdForLevel(3)).toBe("silver");
    expect(getRankIdForLevel(7)).toBe("gold");
    expect(getRankIdForLevel(12)).toBe("platinum");
    expect(getRankIdForLevel(18)).toBe("diamond");
    expect(getRankIdForLevel(25)).toBe("awakened");
  });

  it("defines every rank name for every theme", () => {
    for (const theme of ARC_THEMES) {
      expect(RANK_THRESHOLDS.map((rank) => theme.rankNames[rank.id])).toHaveLength(6);
      expect(RANK_THRESHOLDS.every((rank) => theme.rankNames[rank.id].length > 0)).toBe(true);
    }
  });
});
