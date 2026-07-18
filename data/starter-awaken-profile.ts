import {
  getLevelFromXp,
  getRankIdForLevel,
  recalculateOverallProgress
} from "@/lib/xp-engine";
import { STAT_CATEGORIES } from "@/data/awaken-constants";
import type { StatProgress, UserProfile } from "@/types/awaken";

const STARTING_XP = 0;

const starterStats: StatProgress[] = STAT_CATEGORIES.map((stat) => ({
  stat,
  currentXp: STARTING_XP,
  level: getLevelFromXp(STARTING_XP)
}));

const starterOverall = recalculateOverallProgress(starterStats);

export const starterUserProfile: UserProfile = {
  id: "user-awaken",
  displayName: "Seeker",
  mainArcId: "creator",
  arcThemeId: "minimal",
  disciplineTierId: "untrained",
  disciplineXp: 0,
  overallXp: starterOverall.overallXp,
  overallLevel: starterOverall.overallLevel,
  rankId: getRankIdForLevel(starterOverall.overallLevel),
  stats: starterStats,
  createdAt: "2026-07-01T00:00:00.000Z"
};
