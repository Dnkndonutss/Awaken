"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  CheckSquare,
  Cpu,
  Eye,
  Flame,
  Flower2,
  Home,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords
  ,Settings
} from "lucide-react";
import { ARC_THEMES } from "@/data/awaken-constants";
import { AwakenStateProvider, useAwakenState } from "@/hooks/use-awaken-state";
import { AwakenTutorial } from "@/components/AwakenTutorial";
import { AwakenCelebrations } from "@/components/AwakenCelebrations";
import { getThemeFeatureLabel } from "@/lib/theme-navigation";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/stats", label: "Stats", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/quests", label: "Quests", icon: ScrollText },
  { href: "/bosses", label: "Bosses", icon: Swords },
  { href: "/reviews", label: "Reviews", icon: Shield },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding")) return children;
  return (
    <AwakenStateProvider>
      <ThemedAppShell>{children}</ThemedAppShell>
    </AwakenStateProvider>
  );
}

function ThemedAppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const awaken = useAwakenState();
  const arcTheme =
    ARC_THEMES.find((theme) => theme.id === awaken.profile.arcThemeId) ??
    ARC_THEMES[0];
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";

  if (awaken.isCloudLoading) return <main className="grid min-h-screen place-items-center bg-[#080b12] text-slate-200">Loading your cloud progress…</main>;
  if (awaken.legacyCandidate) return <main className="grid min-h-screen place-items-center bg-[#080b12] p-6 text-slate-100"><section className="max-w-lg rounded-xl border border-amber-300/30 bg-[#0c111d] p-7"><h1 className="text-2xl font-semibold">Existing progress found</h1><p className="mt-3 text-slate-300">{awaken.migrationConflict ? "This account and this browser both contain progress. Nothing will be overwritten automatically." : "Awaken found progress saved in this browser. Import it into your secure cloud account?"}</p><div className="mt-6 flex flex-wrap gap-3"><button className="rounded bg-cyan-300 px-4 py-2 font-semibold text-slate-950 disabled:cursor-wait disabled:opacity-60" disabled={awaken.syncStatus === "saving"} onClick={() => void awaken.importLegacyProgress()}>{awaken.syncStatus === "saving" ? "Importing safely…" : "Import browser progress"}</button>{awaken.migrationConflict && <button className="rounded border border-white/20 px-4 py-2" disabled={awaken.syncStatus === "saving"} onClick={awaken.keepCloudProgress}>Keep cloud progress</button>}</div>{awaken.syncError && <p role="alert" className="mt-4 rounded border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{awaken.syncError}</p>}<p className="mt-4 text-xs text-slate-400">The browser copy is retained as a recovery backup after your choice.</p></section></main>;

  return (
      <div
        className={`awaken-theme ${arcTheme.className} min-h-screen bg-[#080b12] text-slate-100`}
        style={{ "--shadow-aura": Math.min(0.24 + awaken.profile.overallLevel * 0.025, 0.62) } as React.CSSProperties}
      >
        <aside className="app-sidebar fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-[#0c111d]/95 px-4 py-5 lg:block">
          <div className="app-brand-card rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4">
            <div className="knight-crest-mark mb-3 hidden h-14 w-14 items-center justify-center rounded-full lg:flex">
              {isMage ? <Sparkles size={28} aria-hidden="true" /> : isShadowborne ? <Eye size={28} aria-hidden="true" /> : isBeserker ? <Flame size={28} aria-hidden="true" /> : isMuse ? <Flower2 size={28} aria-hidden="true" /> : isFuturistic ? <Cpu size={28} aria-hidden="true" /> : <ShieldCheck size={28} aria-hidden="true" />}
            </div>
            <p className="app-accent-text text-xs font-semibold uppercase tracking-wide text-cyan-200">
              Awaken
            </p>
            <h1 className="app-title-font mt-2 text-2xl font-bold text-white">
              {arcTheme.labels.shellTitle}
            </h1>
            <div className="knight-brand-ribbon mt-4 hidden text-[0.65rem] font-bold uppercase tracking-[0.24em] lg:block">
              {isMage ? "Mana Bound" : isShadowborne ? "Awakening Chain" : isBeserker ? "Rage Streak" : isMuse ? "Flow Streak" : isFuturistic ? "Sync Streak" : "Oath Bound"}
            </div>
          </div>
          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const label = getThemeFeatureLabel(awaken.profile.arcThemeId, item.href as Parameters<typeof getThemeFeatureLabel>[1]);
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link data-tour={`nav-${item.href === "/" ? "home" : item.href.slice(1)}`}
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "app-nav-active border border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="lg:pl-64">
          <header className="app-topbar sticky top-0 z-10 border-b border-white/10 bg-[#080b12]/90 px-4 py-3 backdrop-blur lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="app-accent-text text-xs font-semibold uppercase tracking-wide text-cyan-200">
                  Awaken
                </p>
                <p className="app-title-font font-bold text-white">
                  {arcTheme.labels.shellTitle}
                </p>
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const label = getThemeFeatureLabel(awaken.profile.arcThemeId, item.href as Parameters<typeof getThemeFeatureLabel>[1]);
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <Link data-tour={`nav-${item.href === "/" ? "home" : item.href.slice(1)}`}
                    className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? "app-nav-active bg-cyan-300/10 text-cyan-100"
                        : "bg-white/[0.04] text-slate-400"
                    }`}
                    href={item.href}
                    key={item.href}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>
          </header>
          <main className="px-4 py-5 sm:px-8 lg:px-10">{children}</main>
        </div>
        <AwakenCelebrations />
        <AwakenTutorial />
      </div>
  );
}
