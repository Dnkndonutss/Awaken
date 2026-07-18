import type { AwakenState, ActivityEvent } from "@/hooks/use-awaken-state";
import { getLevelFromXp } from "../xp-engine";
import type { StatCategory, XPLogEntry } from "@/types/awaken";

export type LedgerProjection = XPLogEntry & {
  operationKey: string;
  reversalOf?: string;
};

export type RelationalProjection = {
  xpEvents: LedgerProjection[];
  statProgress: Record<StatCategory, { currentXp: number; level: number }>;
  taskCompletionIds: string[];
  negativeActionEventIds: string[];
  completedQuestIds: string[];
  bossActivityIds: string[];
};

const stats: StatCategory[] = ["strength", "intelligence", "vitality", "wealth", "charisma"];

export function projectXpLedger(activityLog: ActivityEvent[]): LedgerProjection[] {
  const unique = new Map<string, LedgerProjection>();
  for (const event of activityLog) {
    if (event.kind !== "xp") continue;
    const entry = event.result.logEntry;
    if (unique.has(entry.id)) continue;
    unique.set(entry.id, { ...entry, operationKey: entry.id });
  }
  const result = [...unique.values()];
  for (const entry of result) {
    if (!entry.sourceId?.endsWith("-undo") || entry.xpAmount >= 0) continue;
    const originalSourceId = entry.sourceId.slice(0, -5);
    const original = result.find((candidate) => candidate.sourceId === originalSourceId && candidate.xpAmount > 0);
    if (original) entry.reversalOf = original.id;
  }
  return result;
}

export function deriveStatProgress(ledger: LedgerProjection[]) {
  return Object.fromEntries(stats.map((stat) => {
    const currentXp = Math.max(0, ledger.filter((event) => event.stat === stat).reduce((total, event) => total + event.xpAmount, 0));
    return [stat, { currentXp, level: getLevelFromXp(currentXp) }];
  })) as RelationalProjection["statProgress"];
}

export function projectRelationalState(state: AwakenState): RelationalProjection {
  const xpEvents = projectXpLedger(state.activityLog);
  return {
    xpEvents,
    statProgress: deriveStatProgress(xpEvents),
    taskCompletionIds: xpEvents.filter((event) => event.sourceType === "positive_task").map((event) => event.id),
    negativeActionEventIds: xpEvents.filter((event) => event.sourceType === "negative_action").map((event) => event.id),
    completedQuestIds: state.dailyQuests.filter((quest) => quest.completed).map((quest) => quest.id),
    bossActivityIds: state.activityLog.filter((event) => event.kind === "boss").map((event) => event.id)
  };
}
