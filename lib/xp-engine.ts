import {
  DISCIPLINE_TIERS,
  RANK_THRESHOLDS,
  STAT_CATEGORIES
} from "@/data/awaken-constants";
import type {
  DisciplineTierId,
  ApplyManualXpInput,
  LogNegativeActionInput,
  LogPositiveTaskInput,
  RankId,
  StatCategory,
  StatProgress,
  UserProfile,
  XPChangeResult,
  XPLogEntry
} from "@/types/awaken";

const MINIMUM_LEVEL = 0;
const XP_PER_LEVEL_STEP = 100;

export function getXpRequiredForLevel(level: number) {
  const safeLevel = Math.max(MINIMUM_LEVEL, Math.floor(level));
  return safeLevel * safeLevel * XP_PER_LEVEL_STEP;
}

export function getLevelFromXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = MINIMUM_LEVEL;

  while (safeXp >= getXpRequiredForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getDisciplineMultiplier(disciplineTierId: DisciplineTierId) {
  const tier = DISCIPLINE_TIERS.find(
    (disciplineTier) => disciplineTier.id === disciplineTierId
  );

  return tier?.multiplier ?? 1;
}

export function calculatePositiveTaskXp(
  baseXp: number,
  disciplineTierId: DisciplineTierId
) {
  const multiplier = getDisciplineMultiplier(disciplineTierId);

  return Math.round(Math.max(0, baseXp) * multiplier);
}

export function calculateNegativeActionXp(xpPenalty: number) {
  return -Math.abs(Math.round(xpPenalty));
}

export function recalculateOverallProgress(stats: StatProgress[]) {
  const overallXp = stats.reduce(
    (total, statProgress) => total + Math.max(0, statProgress.currentXp),
    0
  );
  const overallLevel = getLevelFromXp(overallXp);
  const rankId = getRankIdForLevel(overallLevel);

  return {
    overallXp,
    overallLevel,
    rankId
  };
}

export function getRankIdForLevel(level: number): RankId {
  const sortedRanks = [...RANK_THRESHOLDS].sort(
    (firstRank, secondRank) => firstRank.minLevel - secondRank.minLevel
  );

  return sortedRanks.reduce<RankId>((currentRankId, rank) => {
    if (level >= rank.minLevel) {
      return rank.id;
    }

    return currentRankId;
  }, sortedRanks[0]?.id ?? "bronze");
}

export function logPositiveTask({
  profile,
  task,
  xpOverride,
  sourceId,
  loggedAt,
  note
}: LogPositiveTaskInput): XPChangeResult {
  const xpGained = xpOverride ?? calculatePositiveTaskXp(task.baseXp, profile.disciplineTierId);

  return applyXpChange({
    profile,
    stat: task.stat,
    xpAmount: xpGained,
    sourceType: "positive_task",
    sourceId: sourceId ?? task.id,
    loggedAt,
    note
  });
}

export function logNegativeAction({
  profile,
  action,
  loggedAt,
  note
}: LogNegativeActionInput): XPChangeResult {
  const xpLost = calculateNegativeActionXp(action.xpPenalty);

  return applyXpChange({
    profile,
    stat: action.stat,
    xpAmount: xpLost,
    sourceType: "negative_action",
    sourceId: action.id,
    loggedAt,
    note
  });
}

export function applyManualXp({
  profile,
  stat,
  xpAmount,
  sourceId,
  loggedAt,
  note
}: ApplyManualXpInput): XPChangeResult {
  return applyXpChange({
    profile,
    stat,
    xpAmount,
    sourceType: "manual_adjustment",
    sourceId,
    loggedAt,
    note
  });
}

type ApplyXpChangeInput = {
  profile: UserProfile;
  stat: StatCategory;
  xpAmount: number;
  sourceType: XPLogEntry["sourceType"];
  sourceId?: string;
  loggedAt?: string;
  note?: string;
};

function applyXpChange({
  profile,
  stat,
  xpAmount,
  sourceType,
  sourceId,
  loggedAt,
  note
}: ApplyXpChangeInput): XPChangeResult {
  const existingStats = ensureAllStats(profile.stats);
  const oldStat = existingStats.find((statProgress) => statProgress.stat === stat);
  const oldStatLevel = oldStat?.level ?? MINIMUM_LEVEL;

  const updatedStats = existingStats.map((statProgress) => {
    if (statProgress.stat !== stat) {
      return statProgress;
    }

    const nextXp = Math.max(0, statProgress.currentXp + xpAmount);
    const nextLevel = getLevelFromXp(nextXp);

    return {
      ...statProgress,
      currentXp: nextXp,
      level: nextLevel
    };
  });

  const updatedStat = updatedStats.find((statProgress) => statProgress.stat === stat);
  const newStatLevel = updatedStat?.level ?? MINIMUM_LEVEL;
  const overallProgress = recalculateOverallProgress(updatedStats);

  const updatedProfile: UserProfile = {
    ...profile,
    stats: updatedStats,
    overallXp: overallProgress.overallXp,
    overallLevel: overallProgress.overallLevel,
    rankId: overallProgress.rankId
  };

  const logEntry: XPLogEntry = {
    id: createXpLogId(sourceType, sourceId),
    createdAt: loggedAt ?? new Date().toISOString(),
    stat,
    xpAmount,
    sourceType,
    sourceId,
    note
  };

  return {
    xpChanged: xpAmount,
    affectedStat: stat,
    oldStatLevel,
    newStatLevel,
    leveledUp: newStatLevel > oldStatLevel,
    leveledDown: newStatLevel < oldStatLevel,
    updatedOverallXp: overallProgress.overallXp,
    updatedOverallLevel: overallProgress.overallLevel,
    updatedRankId: overallProgress.rankId,
    logEntry,
    updatedProfile
  };
}

function ensureAllStats(stats: StatProgress[]) {
  return STAT_CATEGORIES.map((stat) => {
    const existingStat = stats.find((statProgress) => statProgress.stat === stat);

    if (existingStat) {
      return {
        ...existingStat,
        currentXp: Math.max(0, existingStat.currentXp),
        level: getLevelFromXp(existingStat.currentXp)
      };
    }

    return {
      stat,
      currentXp: 0,
      level: MINIMUM_LEVEL
    };
  });
}

function createXpLogId(sourceType: XPLogEntry["sourceType"], sourceId?: string) {
  const sourcePart = sourceId ?? "manual";
  const randomPart =
    typeof crypto === "undefined"
      ? Math.random().toString(36).slice(2)
      : crypto.randomUUID();

  return `${sourceType}-${sourcePart}-${randomPart}`;
}
