import { RANK_THRESHOLDS, STAT_CATEGORIES } from "@/data/awaken-constants";
import type { AwakenState } from "@/hooks/use-awaken-state";
import type { RankId, RankMasteryState, StatCategory } from "@/types/awaken";

export type MasteryRequirement = {
  id: string;
  label: string;
  current: number;
  target: number;
  complete: boolean;
};

export type RankMasteryProgress = {
  currentRankId: RankId;
  nextRankId?: RankId;
  requiredLevel?: number;
  levelReached: boolean;
  requirements: MasteryRequirement[];
  requirementsComplete: boolean;
  promotionReady: boolean;
};

const rankOrder = RANK_THRESHOLDS.map((rank) => rank.id);

export function createRankMasteryState(currentRankId: RankId = "bronze"): RankMasteryState {
  return {
    earnedRankIds: getRanksThrough(currentRankId),
    activeDates: []
  };
}

export function normalizeRankMasteryState(
  mastery: RankMasteryState | undefined,
  currentRankId: RankId,
  state?: Pick<AwakenState, "activityLog">
): RankMasteryState {
  const earned = new Set<RankId>([
    ...getRanksThrough(currentRankId),
    ...(mastery?.earnedRankIds ?? [])
  ]);
  const activeDates = new Set(mastery?.activeDates ?? []);

  for (const event of state?.activityLog ?? []) {
    if (event.kind !== "xp" || event.result.logEntry.xpAmount <= 0) continue;
    activeDates.add(event.result.logEntry.createdAt.slice(0, 10));
  }

  return {
    earnedRankIds: rankOrder.filter((rankId) => earned.has(rankId)),
    activeDates: [...activeDates].sort(),
    ascensionChallenge: mastery?.ascensionChallenge
  };
}

export function applyRankMasteryProgression(state: AwakenState): AwakenState {
  let nextState = state;

  while (true) {
    const progress = getRankMasteryProgress(nextState);
    if (!progress.nextRankId || !progress.promotionReady) break;

    const earnedRankIds = rankOrder.filter((rankId) =>
      nextState.rankMastery.earnedRankIds.includes(rankId) || rankId === progress.nextRankId
    );
    nextState = {
      ...nextState,
      profile: { ...nextState.profile, rankId: progress.nextRankId },
      rankMastery: { ...nextState.rankMastery, earnedRankIds }
    };
  }

  return nextState;
}

export function getRankMasteryProgress(state: AwakenState): RankMasteryProgress {
  const currentIndex = Math.max(0, rankOrder.indexOf(state.profile.rankId));
  const currentRankId = rankOrder[currentIndex] ?? "bronze";
  const nextRank = RANK_THRESHOLDS[currentIndex + 1];

  if (!nextRank) {
    return {
      currentRankId,
      levelReached: true,
      requirements: [],
      requirementsComplete: true,
      promotionReady: false
    };
  }

  const requirements = getRequirements(nextRank.id, state);
  const levelReached = state.profile.overallLevel >= nextRank.minLevel;
  const requirementsComplete = requirements.every((requirement) => requirement.complete);

  return {
    currentRankId,
    nextRankId: nextRank.id,
    requiredLevel: nextRank.minLevel,
    levelReached,
    requirements,
    requirementsComplete,
    promotionReady: levelReached && requirementsComplete
  };
}

function getRequirements(rankId: RankId, state: AwakenState): MasteryRequirement[] {
  if (rankId === "silver") return [];

  const questCount = state.weeklyReports.reduce(
    (total, report) => total + report.dailyQuestsCompleted,
    0
  );
  const defeatedBosses = new Set(
    state.bossHistory.filter((boss) => boss.status === "defeated").map((boss) => boss.id)
  ).size;
  const weeklyReflections = new Set(
    state.weeklyReflections.map((reflection) => reflection.weekStartDate)
  ).size;
  const activeDays = new Set(state.rankMastery.activeDates).size;
  const positiveStats = getPositiveStats(state);
  const statsAtLevelTen = state.profile.stats.filter((stat) => stat.level >= 10).length;
  const statsAtLevelTwenty = state.profile.stats.filter((stat) => stat.level >= 20).length;

  if (rankId === "gold") {
    return [
      requirement("quests", "Complete 20 quests", questCount, 20),
      requirement("stats", "Earn XP in 3 different stats", positiveStats.size, 3),
      requirement("bosses", "Defeat 1 weekly boss", defeatedBosses, 1)
    ];
  }

  if (rankId === "platinum") {
    return [
      requirement("reflections", "Complete 4 weekly reflections", weeklyReflections, 4),
      requirement("bosses", "Defeat 3 weekly bosses", defeatedBosses, 3),
      requirement("stats", "Raise 4 stats to Level 10", statsAtLevelTen, 4)
    ];
  }

  if (rankId === "diamond") {
    return [
      requirement("active-days", "Be active on 30 different days", activeDays, 30),
      requirement("bosses", "Defeat 6 weekly bosses", defeatedBosses, 6),
      requirement("reflections", "Complete 8 weekly reflections", weeklyReflections, 8)
    ];
  }

  return [
    requirement("stats", "Raise all 5 stats to Level 20", statsAtLevelTwenty, STAT_CATEGORIES.length),
    requirement("bosses", "Defeat 12 weekly bosses", defeatedBosses, 12),
    requirement("reflections", "Complete 12 weekly reflections", weeklyReflections, 12),
    requirement(
      "ascension",
      "Complete your final Ascension Challenge",
      state.rankMastery.ascensionChallenge?.completedAt ? 1 : 0,
      1
    )
  ];
}

function getPositiveStats(state: AwakenState) {
  const positiveStats = new Set<StatCategory>();
  for (const stat of state.profile.stats) {
    if (stat.currentXp > 0) positiveStats.add(stat.stat);
  }
  return positiveStats;
}

function requirement(id: string, label: string, current: number, target: number): MasteryRequirement {
  return { id, label, current, target, complete: current >= target };
}

function getRanksThrough(rankId: RankId) {
  const index = Math.max(0, rankOrder.indexOf(rankId));
  return rankOrder.slice(0, index + 1);
}
