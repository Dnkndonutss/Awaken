import { z } from "zod";
import type { AwakenState } from "@/hooks/use-awaken-state";

export const CURRENT_DATA_VERSION = 5;
export const LEGACY_STORAGE_KEYS = ["awaken:dashboard-state:v2", "awaken:mvp-dashboard-state:v1"] as const;

const stateShape = z.object({
  profile: z.object({ id: z.string(), displayName: z.string(), stats: z.array(z.unknown()) }).passthrough(),
  activityLog: z.array(z.unknown()),
  customPositiveTasks: z.array(z.unknown()).default([]),
  customNegativeActions: z.array(z.unknown()).default([]),
  dailyQuests: z.array(z.unknown()).default([]),
  bossHistory: z.array(z.unknown()).default([]),
  dailyReviews: z.array(z.unknown()).default([]),
  dailyInsights: z.array(z.unknown()).default([]),
  weeklyReports: z.array(z.unknown()).default([]),
  weeklyReflections: z.array(z.unknown()).default([])
}).passthrough();

export const backupSchema = z.object({
  format: z.literal("awaken-backup"),
  dataVersion: z.number().int().min(1).max(CURRENT_DATA_VERSION),
  exportedAt: z.string().datetime(),
  state: stateShape
});

export type AwakenBackup = z.infer<typeof backupSchema> & { state: AwakenState };

export function migrateState(input: unknown, version = 2): AwakenState {
  if (version > CURRENT_DATA_VERSION) throw new Error("This data was created by a newer version of Awaken.");
  const parsed = stateShape.safeParse(input);
  if (!parsed.success) throw new Error("The Awaken data is incomplete or malformed.");
  return parsed.data as unknown as AwakenState;
}

export function createBackup(state: AwakenState): AwakenBackup {
  return { format: "awaken-backup", dataVersion: CURRENT_DATA_VERSION, exportedAt: new Date().toISOString(), state };
}

export function parseBackup(input: unknown): AwakenBackup {
  const envelope = backupSchema.parse(input);
  return { ...envelope, state: migrateState(envelope.state, envelope.dataVersion) };
}
