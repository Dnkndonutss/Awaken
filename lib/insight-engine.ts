import type { DailyInsight, DailyQuest, DailyReview } from "@/types/awaken";

type InsightActivityEvent = {
  kind: string;
  result?: {
    xpChanged: number;
    logEntry: {
      createdAt: string;
    };
  };
  combatType?: "damage" | "healing";
  hpAmount?: number;
  createdAt?: string;
};

type GenerateDailyInsightInput = {
  review: DailyReview;
  activityLog: InsightActivityEvent[];
  dailyQuests: DailyQuest[];
};

const reasonLabels: Record<string, string> = {
  too_tired: "low energy",
  poor_sleep: "poor sleep",
  busy: "a crowded schedule",
  forgot: "missed reminders",
  low_motivation: "low motivation",
  injury: "injury or recovery limits",
  bad_planning: "planning friction",
  other: "an unclear trigger"
};

export function generateDailyInsight({
  review,
  activityLog,
  dailyQuests
}: GenerateDailyInsightInput): DailyInsight {
  const todayEvents = activityLog.filter((event) =>
    getEventDate(event).startsWith(review.date)
  );
  const xpGained = todayEvents
    .filter((event) => event.kind === "xp")
    .reduce((total, event) => total + Math.max(0, event.result?.xpChanged ?? 0), 0);
  const xpLost = todayEvents
    .filter((event) => event.kind === "xp")
    .reduce((total, event) => total + Math.abs(Math.min(0, event.result?.xpChanged ?? 0)), 0);
  const bossDamage = todayEvents
    .filter((event) => event.kind === "boss" && event.combatType === "damage")
    .reduce((total, event) => total + (event.hpAmount ?? 0), 0);
  const bossHealing = todayEvents
    .filter((event) => event.kind === "boss" && event.combatType === "healing")
    .reduce((total, event) => total + (event.hpAmount ?? 0), 0);
  const completedQuestCount = dailyQuests.filter((quest) => quest.completed).length;
  const reasonText =
    review.hadNegativeAction && review.negativeActionReason
      ? ` Pattern note: ${reasonLabels[review.negativeActionReason]} may be affecting consistency.`
      : "";

  return {
    id: `daily-insight-${review.date}`,
    date: review.date,
    summary: `System Review: You gained ${xpGained} XP today and lost ${xpLost} XP from negative actions. You completed ${completedQuestCount} daily quests. The active boss was damaged by ${bossDamage} HP and healed by ${bossHealing} HP. Mood ${review.moodLevel}/10, energy ${review.energyLevel}/10.${reasonText} Tomorrow's recommended focus is ${review.tomorrowFocus}.`,
    xpGained,
    xpLost,
    completedQuestCount,
    bossDamage,
    bossHealing,
    moodLevel: review.moodLevel,
    energyLevel: review.energyLevel,
    tomorrowFocus: review.tomorrowFocus,
    createdAt: new Date().toISOString()
  };
}

function getEventDate(event: InsightActivityEvent) {
  return event.result?.logEntry.createdAt ?? event.createdAt ?? "";
}
