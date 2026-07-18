import type { AwakenState } from "@/hooks/use-awaken-state";
import { CURRENT_DATA_VERSION, migrateState } from "@/lib/persistence/schema";

export type CloudState = { state: AwakenState; revision: number; updatedAt: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Cloud request failed.");
  return body as T;
}

export const awakenRepository = {
  async load(): Promise<CloudState | null> {
    const result = await request<{ state: unknown; revision: number; updatedAt: string } | null>("/api/state");
    return result ? { ...result, state: migrateState(result.state, CURRENT_DATA_VERSION) } : null;
  },
  save(state: AwakenState, revision: number, operationId = crypto.randomUUID()) {
    return request<CloudState>("/api/state", { method: "PUT", body: JSON.stringify({ state, revision, operationId, dataVersion: CURRENT_DATA_VERSION }) });
  },
  restore(state: AwakenState, mode: "replace" | "merge", operationId = crypto.randomUUID()) {
    return request<CloudState>("/api/restore", { method: "POST", body: JSON.stringify({ state, mode, operationId, dataVersion: CURRENT_DATA_VERSION }) });
  }
};
