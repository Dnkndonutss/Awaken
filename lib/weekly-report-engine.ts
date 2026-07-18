import type {
  DailyQuest,
  DailyReview,
  ReviewNegativeActionReason,
  StatCategory,
  WeeklyBoss,
  WeeklyReflection,
  WeeklyReport
} from "@/types/awaken";

type WeeklyReportActivityEvent = {
  kind: string;
  name: string;
  result?: {
    xpChanged: number;
    affectedStat: StatCategory;
    oldStatLevel: number;
    newStatLevel: number;
    logEntry: {
      createdAt: string;
      sourceType: string;
      sourceId?: string;
    };
  };
  combatType?: "damage" | "healing";
  hpAmount?: number;
  createdAt?: string;
};

type GenerateWeeklyReportInput = {
  weekStartDate: string;
  weekEndDate: string;
  activityLog: WeeklyReportActivityEvent[];
  dailyQuests: DailyQuest[];
  dailyReviews: DailyReview[];
  activeBoss: WeeklyBoss;
  reflection?: WeeklyReflection;
};

const reasonLabels: Record<ReviewNegativeActionReason, string> = {
  too_tired: "too tired",
  poor_sleep: "poor sleep",
  busy: "busy",
  forgot: "forgotten routines",
  low_motivation: "low motivation",
  injury: "injury",
  bad_planning: "bad planning",
  other: "unclear triggers"
};

const statLabels: Record<StatCategory, string> = {
  strength: "Strength",
  intelligence: "Intelligence",
  vitality: "Vitality",
  wealth: "Wealth",
  charisma: "Charisma"
};

export function generateWeeklyReport({
  weekStartDate,
  weekEndDate,
  activityLog,
  dailyQuests,
  dailyReviews,
  activeBoss,
  reflection
}: GenerateWeeklyReportInput): WeeklyReport {
  const weeklyEvents = activityLog.filter((event) =>
    isDateInRange(getEventDate(event), weekStartDate, weekEndDate)
  );
  const weeklyReviews = dailyReviews.filter((review) =>
    isDateInRange(review.date, weekStartDate, weekEndDate)
  );
  const xpEvents = weeklyEvents.filter((event) => event.kind === "xp");
  const totalXpGained = xpEvents.reduce(
    (total, event) => total + Math.max(0, event.result?.xpChanged ?? 0),
    0
  );
  const totalXpLost = xpEvents.reduce(
    (total, event) => total + Math.abs(Math.min(0, event.result?.xpChanged ?? 0)),
    0
  );
  const statTotals = getStatTotals(xpEvents);
  const strongestStat = getTopStat(statTotals.positive);
  const weakestStat = getTopStat(statTotals.negative);
  const mostImprovedStat = getTopStat(statTotals.net);
  const mostCommonNegativeAction = getMostCommonNegativeAction(xpEvents);
  const mostCommonNegativeActionReason = getMostCommonNegativeReason(weeklyReviews);
  const dailyQuestsCompleted = dailyQuests.filter((quest) => quest.completed).length;
  const dailyQuestsAvailable = dailyQuests.length;
  const dailyQuestCompletionRate =
    dailyQuestsAvailable === 0
      ? 0
      : Math.round((dailyQuestsCompleted / dailyQuestsAvailable) * 100);
  const bossDamageDealt = weeklyEvents
    .filter((event) => event.kind === "boss" && event.combatType === "damage")
    .reduce((total, event) => total + (event.hpAmount ?? 0), 0);
  const bossHealingReceived = weeklyEvents
    .filter((event) => event.kind === "boss" && event.combatType === "healing")
    .reduce((total, event) => total + (event.hpAmount ?? 0), 0);
  const levelsGained = xpEvents.reduce(
    (total, event) =>
      total +
      Math.max(
        0,
        (event.result?.newStatLevel ?? 0) - (event.result?.oldStatLevel ?? 0)
      ),
    0
  );
  const levelsLost = xpEvents.reduce(
    (total, event) =>
      total +
      Math.max(
        0,
        (event.result?.oldStatLevel ?? 0) - (event.result?.newStatLevel ?? 0)
      ),
    0
  );
  const recommendedNextFocus =
    reflection?.nextWeekFocus ||
    getRecommendedFocus(weakestStat, mostCommonNegativeActionReason);

  return {
    id: `weekly-report-${weekStartDate}`,
    weekStartDate,
    weekEndDate,
    totalXpGained,
    totalXpLost,
    netXp: totalXpGained - totalXpLost,
    levelsGained,
    levelsLost,
    strongestStat,
    weakestStat,
    mostImprovedStat,
    mostCommonNegativeAction,
    mostCommonNegativeActionReason,
    dailyQuestCompletionRate,
    dailyQuestsCompleted,
    dailyQuestsAvailable,
    weeklyBossStatus: activeBoss.status,
    weeklyBossName: activeBoss.name,
    bossDamageDealt,
    bossHealingReceived,
    bestStreak: dailyQuestsCompleted,
    recommendedNextFocus,
    summary: createWeeklySummary({
      totalXpGained,
      totalXpLost,
      strongestStat,
      weakestStat,
      activeBoss,
      mostCommonNegativeActionReason,
      recommendedNextFocus
    }),
    reflection,
    createdAt: new Date().toISOString()
  };
}

function getStatTotals(events: WeeklyReportActivityEvent[]) {
  const positive: Partial<Record<StatCategory, number>> = {};
  const negative: Partial<Record<StatCategory, number>> = {};
  const net: Partial<Record<StatCategory, number>> = {};

  for (const event of events) {
    const result = event.result;
    if (!result) {
      continue;
    }

    const stat = result.affectedStat;
    const amount = result.xpChanged;
    net[stat] = (net[stat] ?? 0) + amount;

    if (amount >= 0) {
      positive[stat] = (positive[stat] ?? 0) + amount;
    } else {
      negative[stat] = (negative[stat] ?? 0) + Math.abs(amount);
    }
  }

  return { positive, negative, net };
}

function getTopStat(values: Partial<Record<StatCategory, number>>) {
  return Object.entries(values).sort((first, second) => second[1] - first[1])[0]?.[0] as
    | StatCategory
    | undefined;
}

function getMostCommonNegativeAction(events: WeeklyReportActivityEvent[]) {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.result?.logEntry.sourceType !== "negative_action") {
      continue;
    }

    counts.set(event.name, (counts.get(event.name) ?? 0) + 1);
  }

  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0];
}

function getMostCommonNegativeReason(reviews: DailyReview[]) {
  const counts = new Map<ReviewNegativeActionReason, number>();

  for (const review of reviews) {
    if (!review.hadNegativeAction || !review.negativeActionReason) {
      continue;
    }

    counts.set(
      review.negativeActionReason,
      (counts.get(review.negativeActionReason) ?? 0) + 1
    );
  }

  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0];
}

function getRecommendedFocus(
  weakestStat?: StatCategory,
  reason?: ReviewNegativeActionReason
) {
  if (reason === "poor_sleep" || reason === "too_tired") {
    return "Recovery and sleep discipline";
  }

  if (reason === "bad_planning" || reason === "forgot") {
    return "Planning and friction removal";
  }

  return weakestStat
    ? `${statLabels[weakestStat]} recovery and consistency`
    : "Balanced consistency";
}

function createWeeklySummary({
  totalXpGained,
  totalXpLost,
  strongestStat,
  weakestStat,
  activeBoss,
  mostCommonNegativeActionReason,
  recommendedNextFocus
}: {
  totalXpGained: number;
  totalXpLost: number;
  strongestStat?: StatCategory;
  weakestStat?: StatCategory;
  activeBoss: WeeklyBoss;
  mostCommonNegativeActionReason?: ReviewNegativeActionReason;
  recommendedNextFocus: string;
}) {
  const netXp = totalXpGained - totalXpLost;
  const strongestText = strongestStat ? statLabels[strongestStat] : "No stat";
  const weakestText = weakestStat ? statLabels[weakestStat] : "no clear stat";
  const reasonText = mostCommonNegativeActionReason
    ? ` Pattern detected: most negative actions were tied to ${reasonLabels[mostCommonNegativeActionReason]}.`
    : "";

  return `Weekly System Report: You gained ${totalXpGained} XP and lost ${totalXpLost} XP this week, for a net gain of ${netXp} XP. ${strongestText} was your strongest stat, while ${weakestText} limited consistency. ${activeBoss.name} is ${activeBoss.status}.${reasonText} Recommended next focus: ${recommendedNextFocus}.`;
}

function getEventDate(event: WeeklyReportActivityEvent) {
  return event.result?.logEntry.createdAt ?? event.createdAt ?? "";
}

function isDateInRange(value: string, start: string, end: string) {
  const date = value.slice(0, 10);

  return date >= start && date <= end;
}
