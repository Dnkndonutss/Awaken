import type { AwakenState } from "@/hooks/use-awaken-state";
import type { OnboardingInput, UserSettings } from "@/lib/onboarding";
import { CURRENT_DATA_VERSION } from "@/lib/persistence/schema";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 120000);
  let response: Response;
  try { response = await fetch(url, { ...init, signal: controller.signal, headers: { "content-type": "application/json", ...init?.headers } }); }
  catch (error) { if (error instanceof DOMException && error.name === "AbortError") throw new Error("Awaken could not reach cloud storage. Check your connection and try again."); throw error; }
  finally { window.clearTimeout(timeout); }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Request failed.");
  return body as T;
}
export const settingsRepository = {
  load: () => request<{ settings: UserSettings | null; hasProgress: boolean; email: string }>("/api/settings"),
  update: (settings: OnboardingInput & { notificationPermission?: string }) => request<{ settings: UserSettings; reloadRequired?: boolean }>("/api/settings", { method: "PUT", body: JSON.stringify(settings) }),
  complete: (settings: OnboardingInput, state: AwakenState, operationId: string) => request<{ state: AwakenState; revision: number; settings: UserSettings }>("/api/onboarding", { method: "POST", body: JSON.stringify({ settings, state, operationId, dataVersion: CURRENT_DATA_VERSION }) })
};
