import { describe, expect, it } from "vitest";
import { ARC_THEMES, RANK_THRESHOLDS } from "@/data/awaken-constants";
import {
  getLevelFromXp,
  getRankIdForLevel,
  getXpRequiredForLevel,
  MAX_LEVEL
} from "@/lib/xp-engine";

describe("rank progression", () => {
  it("uses an attainable six-rank level ladder", () => {
    expect(RANK_THRESHOLDS.map(({ id, minLevel }) => ({ id, minLevel }))).toEqual([
      { id: "bronze", minLevel: 0 },
      { id: "silver", minLevel: 12 },
      { id: "gold", minLevel: 28 },
      { id: "platinum", minLevel: 48 },
      { id: "diamond", minLevel: 72 },
      { id: "awakened", minLevel: 100 }
    ]);

    expect(RANK_THRESHOLDS.map((rank) => getXpRequiredForLevel(rank.minLevel))).toEqual([
      0,
      1_570,
      9_486,
      31_334,
      79_834,
      175_000
    ]);
  });

  it("promotes at each exact level boundary", () => {
    expect(getRankIdForLevel(0)).toBe("bronze");
    expect(getRankIdForLevel(12)).toBe("silver");
    expect(getRankIdForLevel(28)).toBe("gold");
    expect(getRankIdForLevel(48)).toBe("platinum");
    expect(getRankIdForLevel(72)).toBe("diamond");
    expect(getRankIdForLevel(100)).toBe("awakened");
  });

  it("uses all 100 levels and caps progression at level 100", () => {
    expect(getLevelFromXp(900)).toBe(9);
    expect(getLevelFromXp(getXpRequiredForLevel(MAX_LEVEL) - 1)).toBe(99);
    expect(getLevelFromXp(getXpRequiredForLevel(MAX_LEVEL))).toBe(MAX_LEVEL);
    expect(getLevelFromXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
    expect(getXpRequiredForLevel(MAX_LEVEL + 1)).toBe(
      getXpRequiredForLevel(MAX_LEVEL)
    );
  });

  it("defines every rank name for every theme", () => {
    for (const theme of ARC_THEMES) {
      expect(RANK_THRESHOLDS.map((rank) => theme.rankNames[rank.id])).toHaveLength(6);
      expect(RANK_THRESHOLDS.every((rank) => theme.rankNames[rank.id].length > 0)).toBe(true);
    }
  });
});
