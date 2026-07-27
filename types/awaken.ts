export type StatCategory =
  | "strength"
  | "intelligence"
  | "vitality"
  | "wealth"
  | "charisma";

export type DisciplineTierId =
  | "untrained"
  | "steady"
  | "focused"
  | "elite"
  | "awakened";

export type DisciplineTier = {
  id: DisciplineTierId;
  name: string;
  multiplier: number;
  description: string;
};

export type RankId =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "awakened";

export type Rank = {
  id: RankId;
  name: string;
  minLevel: number;
};

export type MainArcId =
  | "warrior"
  | "scholar"
  | "guardian"
  | "builder"
  | "leader"
  | "creator";

export type ArcThemeId =
  | "minimal"
  | "knight"
  | "mage"
  | "anime_dark"
  | "berserker"
  | "muse"
  | "futuristic";

export type MainArc = {
  id: MainArcId;
  name: string;
  description: string;
  primaryStats: StatCategory[];
};

export type ArcTheme = {
  id: ArcThemeId;
  name: string;
  tagline: string;
  className: string;
  fontLabel: string;
  rankNames: Record<RankId, string>;
  labels: {
    shellTitle: string;
    dashboardTitle: string;
    dashboardText: string;
    arcPanelTitle: string;
    questName: string;
    bossName: string;
    reviewName: string;
    xpName: string;
  };
};

export type PositiveTask = {
  id: string;
  title: string;
  description?: string;
  stat: StatCategory;
  baseXp: number;
  tags: string[];
};

export type NegativeActionReason =
  | "stress"
  | "boredom"
  | "fatigue"
  | "social_pressure"
  | "avoidance"
  | "poor_planning"
  | "environment"
  | "unknown";

export type NegativeAction = {
  id: string;
  title: string;
  description?: string;
  stat: StatCategory;
  xpPenalty: number;
  commonReasons: NegativeActionReason[];
  tags: string[];
};

export type StatProgress = {
  stat: StatCategory;
  currentXp: number;
  level: number;
};

export type UserProfile = {
  id: string;
  displayName: string;
  mainArcId: MainArcId;
  arcThemeId: ArcThemeId;
  disciplineTierId: DisciplineTierId;
  disciplineXp: number;
  overallXp: number;
  overallLevel: number;
  rankId: RankId;
  stats: StatProgress[];
  createdAt: string;
};

export type AscensionChallenge = {
  objective: string;
  successCriteria: string;
  targetDate: string;
  linkedStats: StatCategory[];
  createdAt: string;
  completedAt?: string;
};

export type RankMasteryState = {
  earnedRankIds: RankId[];
  activeDates: string[];
  ascensionChallenge?: AscensionChallenge;
};

export type DailyQuestType =
  | "main"
  | "arc"
  | "recovery"
  | "bonus"
  | "side";

export type DailyQuest = {
  id: string;
  date: string;
  title: string;
  description: string;
  linkedTaskId?: string;
  targetStat: StatCategory;
  xpReward: number;
  questType: DailyQuestType;
  sourceTaskIds: string[];
  completed: boolean;
  completedAt?: string;
};

export type WeeklyBoss = {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  currentHp: number;
  targetStat: StatCategory;
  weekStartDate: string;
  weekEndDate: string;
  damageTaskIds: string[];
  healingNegativeActionIds: string[];
  status: "active" | "defeated" | "escaped";
  rewards: WeeklyBossRewards;
  rewardsClaimed: boolean;
};

export type WeeklyBossRewards = {
  statXp: number;
  disciplineXp: number;
  titleUnlock?: string;
};

export type XPLogEntry = {
  id: string;
  createdAt: string;
  stat: StatCategory;
  xpAmount: number;
  sourceType: "positive_task" | "negative_action" | "manual_adjustment";
  sourceId?: string;
  note?: string;
};

export type ReviewNegativeActionReason =
  | "too_tired"
  | "poor_sleep"
  | "busy"
  | "forgot"
  | "low_motivation"
  | "injury"
  | "bad_planning"
  | "other";

export type DailyReview = {
  id: string;
  date: string;
  biggestWin: string;
  biggestMistake: string;
  energyLevel: number;
  moodLevel: number;
  hadNegativeAction: boolean;
  negativeActionReason?: ReviewNegativeActionReason;
  tomorrowFocus: string;
  updatedAt: string;
};

export type DailyInsight = {
  id: string;
  date: string;
  summary: string;
  xpGained: number;
  xpLost: number;
  completedQuestCount: number;
  bossDamage: number;
  bossHealing: number;
  moodLevel: number;
  energyLevel: number;
  tomorrowFocus: string;
  createdAt: string;
};

export type WeeklyReflection = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  biggestWin: string;
  biggestSetback: string;
  lessonLearned: string;
  nextWeekFocus: string;
  updatedAt: string;
};

export type WeeklyReport = {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  totalXpGained: number;
  totalXpLost: number;
  netXp: number;
  levelsGained: number;
  levelsLost: number;
  strongestStat?: StatCategory;
  weakestStat?: StatCategory;
  mostImprovedStat?: StatCategory;
  mostCommonNegativeAction?: string;
  mostCommonNegativeActionReason?: ReviewNegativeActionReason;
  dailyQuestCompletionRate: number;
  dailyQuestsCompleted: number;
  dailyQuestsAvailable: number;
  weeklyBossStatus: WeeklyBoss["status"];
  weeklyBossName: string;
  bossDamageDealt: number;
  bossHealingReceived: number;
  bestStreak: number;
  recommendedNextFocus: string;
  summary: string;
  reflection?: WeeklyReflection;
  createdAt: string;
};

export type IdealBuildPreset = {
  id: string;
  name: string;
  description: string;
  focusStats: StatCategory[];
  suggestedArcIds: MainArcId[];
};

export type XPChangeResult = {
  xpChanged: number;
  affectedStat: StatCategory;
  oldStatLevel: number;
  newStatLevel: number;
  leveledUp: boolean;
  leveledDown: boolean;
  updatedOverallXp: number;
  updatedOverallLevel: number;
  updatedRankId: RankId;
  logEntry: XPLogEntry;
  updatedProfile: UserProfile;
};

export type LogPositiveTaskInput = {
  profile: UserProfile;
  task: PositiveTask;
  xpOverride?: number;
  sourceId?: string;
  loggedAt?: string;
  note?: string;
};

export type LogNegativeActionInput = {
  profile: UserProfile;
  action: NegativeAction;
  loggedAt?: string;
  note?: string;
};

export type ApplyManualXpInput = {
  profile: UserProfile;
  stat: StatCategory;
  xpAmount: number;
  sourceId?: string;
  loggedAt?: string;
  note?: string;
};
