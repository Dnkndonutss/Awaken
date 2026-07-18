import type { ActivityEvent } from "@/hooks/use-awaken-state";
import type { StatCategory } from "@/types/awaken";

export type XpChartMetric = "total" | "net" | StatCategory;
export type XpChartRange = 7 | 30 | 90 | "all";
export type XpChartMode = "daily" | "cumulative";

export type XpProgressPoint = {
  date: string;
  xpGained: number;
  xpLost: number;
  netXp: number;
  completedTasks: number;
  affectedStats: StatCategory[];
  statNetXp: Record<StatCategory, number>;
  value: number;
};

type BuildXpProgressSeriesInput = {
  activityLog: readonly ActivityEvent[];
  metric: XpChartMetric;
  range: XpChartRange;
  mode: XpChartMode;
  today: string;
  timeZone?: string;
};

const statCategories: StatCategory[] = ["strength", "intelligence", "vitality", "wealth", "charisma"];

export function buildXpProgressSeries({
  activityLog,
  metric,
  range,
  mode,
  today,
  timeZone = "UTC"
}: BuildXpProgressSeriesInput) {
  const entries = getUniqueXpEntries(activityLog, timeZone).filter((entry) => entry.date <= today);
  const earliestDate = entries.reduce<string | undefined>(
    (earliest, entry) => !earliest || entry.date < earliest ? entry.date : earliest,
    undefined
  );
  const startDate = range === "all"
    ? earliestDate
    : addDays(today, -(range - 1));

  if (!startDate) {
    return { points: [] as XpProgressPoint[], hasActivity: false, activeDayCount: 0 };
  }

  const buckets = new Map<string, Omit<XpProgressPoint, "value">>();
  for (const date of enumerateDates(startDate, today)) {
    buckets.set(date, createEmptyPoint(date));
  }

  for (const entry of entries) {
    const bucket = buckets.get(entry.date);
    if (!bucket) continue;

    if (entry.xpAmount >= 0) bucket.xpGained += entry.xpAmount;
    else bucket.xpLost += Math.abs(entry.xpAmount);
    bucket.netXp += entry.xpAmount;
    bucket.statNetXp[entry.stat] += entry.xpAmount;
    if (!bucket.affectedStats.includes(entry.stat)) bucket.affectedStats.push(entry.stat);
    if (entry.completedTask) bucket.completedTasks += 1;
  }

  let cumulative = 0;
  const points = [...buckets.values()].map((point) => {
    const dailyValue = getMetricValue(point, metric);
    cumulative += dailyValue;
    return { ...point, value: mode === "cumulative" ? cumulative : dailyValue };
  });
  const activeDayCount = points.filter((point) => point.xpGained > 0 || point.xpLost > 0).length;

  return { points, hasActivity: activeDayCount > 0, activeDayCount };
}

export function getDateKey(date: Date, timeZone = "UTC") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getUniqueXpEntries(activityLog: readonly ActivityEvent[], timeZone: string) {
  const entries = new Map<string, {
    date: string;
    stat: StatCategory;
    xpAmount: number;
    completedTask: boolean;
  }>();

  for (const event of activityLog) {
    if (event.kind === "xp") {
      const logEntry = event.result.logEntry;
      if (entries.has(logEntry.id)) continue;
      entries.set(logEntry.id, {
        date: getDateKey(new Date(logEntry.createdAt), timeZone),
        stat: logEntry.stat,
        xpAmount: logEntry.xpAmount,
        completedTask: logEntry.sourceType === "positive_task" && logEntry.xpAmount > 0
      });
    } else if (event.kind === "boss_reward" && !entries.has(event.id)) {
      entries.set(event.id, {
        date: getDateKey(new Date(event.createdAt), timeZone),
        stat: event.targetStat,
        xpAmount: event.statXp,
        completedTask: false
      });
    }
  }

  return [...entries.values()].filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
}

function createEmptyPoint(date: string): Omit<XpProgressPoint, "value"> {
  return {
    date,
    xpGained: 0,
    xpLost: 0,
    netXp: 0,
    completedTasks: 0,
    affectedStats: [],
    statNetXp: { strength: 0, intelligence: 0, vitality: 0, wealth: 0, charisma: 0 }
  };
}

function getMetricValue(point: Omit<XpProgressPoint, "value">, metric: XpChartMetric) {
  if (metric === "total") return point.xpGained;
  if (metric === "net") return point.netXp;
  return point.statNetXp[metric];
}

function enumerateDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export { statCategories as XP_ANALYTICS_STATS };
