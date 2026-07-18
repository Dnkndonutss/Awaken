"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useAwakenState } from "@/hooks/use-awaken-state";
import { awakenRepository } from "@/lib/persistence/repository";
import { createBackup, parseBackup, type AwakenBackup } from "@/lib/persistence/schema";
import { createClient } from "@/lib/supabase/client";
import { ARC_THEMES, IDEAL_BUILD_PRESETS, MAIN_ARCS, STAT_CATEGORIES, STAT_CATEGORY_LABELS } from "@/data/awaken-constants";
import { defaultOnboardingDraft, DIFFICULTIES, type OnboardingInput } from "@/lib/onboarding";
import { settingsRepository } from "@/lib/settings-repository";

const DELETE_ACCOUNT_CONFIRMATION = "DELETE MY AWAKEN ACCOUNT";

export default function SettingsPage() {
  const awaken = useAwakenState();
  const [preview, setPreview] = useState<AwakenBackup | null>(null);
  const [message, setMessage] = useState("");
  const [preferences, setPreferences] = useState<OnboardingInput>(defaultOnboardingDraft);
  const [email, setEmail] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteConfirmationRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void settingsRepository.load().then((result) => { if (result.settings) setPreferences(result.settings); setEmail(result.email); }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load settings.")); }, []);
  useEffect(() => {
    if (deleteDialogOpen) deleteConfirmationRef.current?.focus();
  }, [deleteDialogOpen]);
  function update(value: Partial<OnboardingInput>) { setPreferences((current) => ({ ...current, ...value })); }
  async function savePreferences() { try { const result = await settingsRepository.update(preferences); if (result.reloadRequired) { window.location.reload(); return; } awaken.updateProfileIdentity({ displayName: preferences.displayName, mainArcId: preferences.mainArcId as Parameters<typeof awaken.updateProfileIdentity>[0]["mainArcId"], arcThemeId: preferences.arcThemeId as Parameters<typeof awaken.updateProfileIdentity>[0]["arcThemeId"] }); setMessage("Settings saved. Your build and main arc can change without resetting progress."); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save settings."); } }
  async function enableNotifications() { if (!("Notification" in window)) return setMessage("Notifications are not supported by this browser."); const permission = await Notification.requestPermission(); if (permission !== "granted") { update({ remindersEnabled: false }); return setMessage("Notification permission was not granted. Reminders remain disabled."); } update({ remindersEnabled: true }); setMessage("Notifications enabled. Save settings to keep this preference."); }
  function testNotification() { if (!("Notification" in window) || Notification.permission !== "granted") return setMessage("Enable browser notifications before sending a test."); new Notification("Awaken test", { body: "Your reminders are ready." }); }

  function exportData() {
    const backup = createBackup(awaken.getBackupState());
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = `awaken-backup-${backup.exportedAt.slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function inspect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { setPreview(parseBackup(JSON.parse(await file.text()))); setMessage(""); } catch (error) { setPreview(null); setMessage(error instanceof Error ? error.message : "Invalid backup."); }
  }
  async function restore() {
    if (!preview || !window.confirm("Replace all cloud progress with this backup? This cannot be undone.")) return;
    try { await awakenRepository.restore(preview.state, "replace"); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed."); }
  }
  async function deleteAccount() {
    if (deleteConfirmation !== DELETE_ACCOUNT_CONFIRMATION || isDeleting) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation })
      });
      const body = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Deletion failed.");
      localStorage.clear();
      window.location.assign("/auth");
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Deletion failed.");
      setIsDeleting(false);
    }
  }
  function openDeleteDialog() { setDeleteConfirmation(""); setDeleteError(""); setDeleteDialogOpen(true); }
  function closeDeleteDialog() { if (isDeleting) return; setDeleteDialogOpen(false); setDeleteConfirmation(""); setDeleteError(""); }
  async function signOut() { await createClient().auth.signOut(); window.location.assign("/auth"); }
  async function restartTutorial() { try { const response = await fetch("/api/tutorial", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restart", operationId: crypto.randomUUID() }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Unable to restart tutorial."); window.location.assign("/"); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to restart tutorial."); } }

  return <div className="mx-auto max-w-3xl space-y-6 p-6 lg:p-10"><header><h1 className="text-3xl font-semibold">Settings</h1><p className="mt-2 text-slate-400">Cloud status: {awaken.syncStatus}</p></header>
    <section className="grid gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-5 text-sm text-slate-300"><h2 className="text-xl font-semibold text-white">Your growth path</h2><p><strong className="text-white">Ideal build</strong> controls your mix of focus stats and recommendations.</p><p><strong className="text-white">Main arc</strong> is your ongoing identity and primary path. You can change either below without resetting earned XP, quests, or history.</p></section>
    <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Profile</h2><label className="grid gap-1">Display name<input className="rounded border border-white/15 bg-black/20 p-3" value={preferences.displayName} onChange={(e)=>update({displayName:e.target.value})}/></label><label className="grid gap-1">Primary goal<input className="rounded border border-white/15 bg-black/20 p-3" value={preferences.primaryGoal} onChange={(e)=>update({primaryGoal:e.target.value})}/></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1">Ideal build<select className="rounded border border-white/15 bg-[#101522] p-3" value={preferences.presetId} onChange={(e)=>update({presetId:e.target.value})}>{IDEAL_BUILD_PRESETS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="grid gap-1">Main arc<select className="rounded border border-white/15 bg-[#101522] p-3" value={preferences.mainArcId} onChange={(e)=>update({mainArcId:e.target.value as never})}>{MAIN_ARCS.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></div><fieldset><legend>Priority categories</legend><div className="mt-2 flex flex-wrap gap-2">{STAT_CATEGORIES.map(x=><button key={x} onClick={()=>update({categories:preferences.categories.includes(x)?preferences.categories.filter(y=>y!==x):[...preferences.categories,x]})} className={`rounded px-3 py-2 ${preferences.categories.includes(x)?'bg-cyan-300 text-slate-950':'bg-white/10'}`}>{STAT_CATEGORY_LABELS[x]}</button>)}</div></fieldset><label className="grid gap-1">Difficulty<select className="rounded border border-white/15 bg-[#101522] p-3" value={preferences.difficulty} onChange={(e)=>update({difficulty:e.target.value as never})}>{Object.entries(DIFFICULTIES).map(([id,x])=><option key={id} value={id}>{x.label}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1">Daily reset<input type="time" className="rounded border border-white/15 bg-black/20 p-3" value={preferences.dailyResetTime} onChange={(e)=>update({dailyResetTime:e.target.value})}/></label><label className="grid gap-1">Time zone<input className="rounded border border-white/15 bg-black/20 p-3" value={preferences.timeZone} onChange={(e)=>update({timeZone:e.target.value})}/></label></div></section>
    <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Appearance</h2><label className="grid gap-1">Theme<select className="rounded border border-white/15 bg-[#101522] p-3" value={preferences.arcThemeId} onChange={(e)=>update({arcThemeId:e.target.value as never,theme:e.target.value})}>{ARC_THEMES.map(x=><option key={x.id} value={x.id}>{x.name} — {x.tagline}</option>)}</select></label></section>
    <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Tasks and habits</h2><p className="text-slate-400">{preferences.tasks.length} onboarding preferences. Add and manage custom positive habits and negative actions from the Tasks area; XP is always previewed there before logging.</p></section>
    <section className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Notifications</h2><label className="flex gap-3"><input type="checkbox" checked={preferences.remindersEnabled} onChange={(e)=>e.target.checked?void enableNotifications():update({remindersEnabled:false})}/><span>Enable reminders</span></label>{preferences.remindersEnabled&&<label className="grid gap-1">Reminder time<input type="time" className="rounded border border-white/15 bg-black/20 p-3" value={preferences.reminderTimes[0]??'09:00'} onChange={(e)=>update({reminderTimes:[e.target.value]})}/></label>}<button className="w-fit rounded border border-white/20 px-4 py-2" onClick={testNotification}>Send test notification</button></section>
    <button className="rounded bg-cyan-300 px-5 py-3 font-semibold text-slate-950" onClick={()=>void savePreferences()}>Save profile and preferences</button>
    <section className="rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Tutorial</h2><p className="my-3 text-slate-400">Replay the guided introduction to XP, tasks, quests, bosses, reviews, analytics, and settings. Tutorial examples never change real progress.</p><button className="rounded border border-cyan-300/40 px-4 py-2 text-cyan-100" onClick={() => void restartTutorial()}>Start tutorial</button></section>
    <section className="rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Backup</h2><p className="my-3 text-slate-400">Export a human-readable, versioned copy without credentials or secrets.</p><button className="rounded bg-cyan-300 px-4 py-2 font-semibold text-slate-950" onClick={exportData}>Download backup</button></section>
    <section className="rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Restore</h2><input className="my-4 block" type="file" accept="application/json,.json" onChange={inspect}/>{preview && <div className="rounded border border-amber-300/20 p-4"><p>Exported {new Date(preview.exportedAt).toLocaleString()} · data version {preview.dataVersion}</p><p className="mt-1 text-sm text-slate-400">Profile: {preview.state.profile.displayName}; {preview.state.activityLog.length} recent activity events</p><button className="mt-3 rounded bg-amber-300 px-4 py-2 font-semibold text-slate-950" onClick={() => void restore()}>Replace with this backup</button></div>}</section>
    {message && <p role="alert" className="text-amber-200">{message}</p>}
    <section className="rounded-xl border border-white/10 bg-white/5 p-5"><h2 className="text-xl font-semibold">Account</h2><p className="my-3 text-slate-400">Signed in as {email || "your verified account"}. Password reset is available from the sign-in screen. Deletion permanently removes the account and all owner-scoped Awaken data through database cascades.</p><div className="flex flex-wrap gap-3"><button className="rounded border border-white/20 px-4 py-2" onClick={() => void signOut()}>Sign out</button><button className="rounded border border-red-400/50 px-4 py-2 text-red-200" onClick={openDeleteDialog}>Delete account and data</button></div></section>
    {deleteDialogOpen ? (
      <div
        aria-labelledby="delete-account-title"
        aria-modal="true"
        className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4 backdrop-blur-sm"
        onKeyDown={(event) => { if (event.key === "Escape") closeDeleteDialog(); }}
        role="dialog"
      >
        <div className="w-full max-w-lg rounded-xl border border-red-400/30 bg-[#0b0f18] p-6 shadow-2xl">
          <h2 className="text-2xl font-semibold text-white" id="delete-account-title">Permanently delete your account?</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            This removes your account and all Awaken progress. It cannot be undone. Type the phrase below to continue:
          </p>
          <p className="mt-3 rounded-md border border-red-300/20 bg-red-300/10 px-3 py-2 font-mono text-sm text-red-100">
            {DELETE_ACCOUNT_CONFIRMATION}
          </p>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-slate-200">
            Confirmation phrase
            <input
              autoComplete="off"
              className="min-h-11 rounded-md border border-white/15 bg-black/30 px-3 font-normal text-white outline-none focus:border-red-300/70"
              onChange={(event) => { setDeleteConfirmation(event.target.value); setDeleteError(""); }}
              ref={deleteConfirmationRef}
              value={deleteConfirmation}
            />
          </label>
          {deleteError ? <p className="mt-3 text-sm text-red-200" role="alert">{deleteError}</p> : null}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button className="rounded border border-white/20 px-4 py-2" disabled={isDeleting} onClick={closeDeleteDialog} type="button">Cancel</button>
            <button
              className="rounded bg-red-500 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={deleteConfirmation !== DELETE_ACCOUNT_CONFIRMATION || isDeleting}
              onClick={() => void deleteAccount()}
              type="button"
            >
              {isDeleting ? "Deleting account…" : "Permanently delete account"}
            </button>
          </div>
        </div>
      </div>
    ) : null}
  </div>;
}
