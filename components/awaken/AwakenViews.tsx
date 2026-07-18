"use client";

import {
  Activity,
  Axe,
  BookOpen,
  Box,
  Brain,
  BicepsFlexed,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardPlus,
  Cpu,
  Dumbbell,
  Flame,
  FlaskConical,
  Flower2,
  Gem,
  Hammer,
  HandHeart,
  HeartPulse,
  Hourglass,
  Link2,
  Map,
  Megaphone,
  Minus,
  Network,
  Plus,
  PersonStanding,
  Radar,
  Save,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  Skull,
  Swords,
  Users,
  WandSparkles
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  ARC_THEMES,
  DISCIPLINE_TIERS,
  PRESET_NEGATIVE_ACTIONS,
  PRESET_POSITIVE_TASKS,
  RANK_THRESHOLDS,
  STAT_CATEGORIES,
  STAT_CATEGORY_LABELS
} from "@/data/awaken-constants";
import {
  analyzeManualTaskXp,
  createReviewDraft,
  createWeeklyReflectionDraft,
  type ActivityEvent,
  type DailyReviewDraft,
  type ManualXpEstimate,
  type WeeklyReflectionDraft,
  useAwakenState
} from "@/hooks/use-awaken-state";
import { getRankIdForLevel, getXpRequiredForLevel } from "@/lib/xp-engine";
import { WEEKLY_BOSS_ROSTER } from "@/lib/boss-engine";
import { KnightFrame, type KnightFrameVariant } from "@/components/KnightFrame";
import { RadarMap } from "@/components/RadarMap";
import { XpProgressChart } from "@/components/XpProgressChart";
import type {
  DailyReview,
  ReviewNegativeActionReason,
  ArcThemeId,
  StatCategory,
  WeeklyBoss,
  WeeklyReport
} from "@/types/awaken";

const statIcons: Record<StatCategory, typeof Dumbbell> = {
  strength: Dumbbell,
  intelligence: Brain,
  vitality: HeartPulse,
  wealth: CircleDollarSign,
  charisma: Users
};

const mageStatIcons: Record<StatCategory, typeof Dumbbell> = {
  strength: WandSparkles,
  intelligence: BookOpen,
  vitality: FlaskConical,
  wealth: Gem,
  charisma: Sparkles
};

const shadowStatIcons: Record<StatCategory, typeof Dumbbell> = {
  strength: Swords,
  intelligence: Brain,
  vitality: Flame,
  wealth: Gem,
  charisma: Users
};

const beserkerStatIcons: Record<StatCategory, typeof Dumbbell> = {
  strength: Axe,
  intelligence: Map,
  vitality: Skull,
  wealth: Hammer,
  charisma: Megaphone
};

const museStatIcons: Record<StatCategory, typeof Dumbbell> = {
  strength: PersonStanding,
  intelligence: BookOpen,
  vitality: Flower2,
  wealth: Paintbrush,
  charisma: HandHeart
};

const futuristicStatIcons: Record<StatCategory, typeof Dumbbell> = {
  strength: BicepsFlexed,
  intelligence: Cpu,
  vitality: HeartPulse,
  wealth: Box,
  charisma: Network
};

const negativeActionReasonOptions: Array<{
  value: ReviewNegativeActionReason;
  label: string;
}> = [
  { value: "too_tired", label: "Too tired" },
  { value: "poor_sleep", label: "Poor sleep" },
  { value: "busy", label: "Busy" },
  { value: "forgot", label: "Forgot" },
  { value: "low_motivation", label: "Low motivation" },
  { value: "injury", label: "Injury" },
  { value: "bad_planning", label: "Bad planning" },
  { value: "other", label: "Other" }
];

const dailyQuestGuide = [
  { name: "Main Quest", purpose: "Strengthens your weakest stat.", reward: "Task XP +25" },
  { name: "Arc Quest", purpose: "Advances a primary stat from your Main Arc.", reward: "Task XP +20" },
  { name: "Recovery Quest", purpose: "Counters recent setbacks or supports Vitality.", reward: "Task XP +15" },
  { name: "Bonus Quest", purpose: "Adds another action for one of your weaker stats.", reward: "Task XP +10" },
  { name: "Side Quest", purpose: "Uses another available positive task.", reward: "Normal task XP" }
] as const;

export function HomeView() {
  const awaken = useAwakenState();
  const arcTheme = getCurrentArcTheme(awaken.profile.arcThemeId);
  const currentRankId = getRankIdForLevel(awaken.profile.overallLevel);
  const rankName = arcTheme.rankNames[currentRankId] ?? currentRankId;
  const overallProgress = getLevelProgress(
    awaken.profile.overallXp,
    awaken.profile.overallLevel
  );
  const rankProgress = getRankProgress(
    awaken.profile.overallXp,
    awaken.profile.overallLevel,
    awaken.profile.arcThemeId
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow="Home"
        title={arcTheme.labels.dashboardTitle}
        text={arcTheme.labels.dashboardText}
      />
      {awaken.profile.arcThemeId === "knight" ? (
        <RoyalBanner rankName={rankName} renown={awaken.profile.overallXp} />
      ) : null}
      <section data-tour="dashboard" className="grid gap-4 rounded-xl lg:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <div className="flex flex-wrap items-end gap-7">
            <Metric label="Level" value={awaken.profile.overallLevel} />
            <Metric label="Rank" value={rankName} />
            <Metric label={`Total ${arcTheme.labels.xpName}`} value={awaken.profile.overallXp} />
          </div>
          <div className="mt-7">
            <ProgressBar
              detail={`${overallProgress.current} / ${overallProgress.needed} XP`}
              label={`Progress to level ${awaken.profile.overallLevel + 1}`}
              value={overallProgress.percent}
            />
          </div>
          <div className="mt-5">
            <ProgressBar
              detail={rankProgress.next
                ? `${rankProgress.remainingXp.toLocaleString()} ${arcTheme.labels.xpName} remaining`
                : "Highest rank achieved"}
              label={rankProgress.next
                ? `${rankProgress.currentName} → ${rankProgress.nextName} at level ${rankProgress.next.minLevel}`
                : `${rankProgress.currentName} — maximum rank`}
              value={rankProgress.percent}
            />
          </div>
        </Panel>
        <ArcThemePanel />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <QuickTaskPanel compact />
        <NegativeActionPanel compact />
      </section>
      <BossPanel compact />
      <QuestBoard preview />
    </PageStack>
  );
}

function RoyalBanner({
  rankName,
  renown
}: Readonly<{ rankName: string; renown: number }>) {
  return (
    <section className="knight-royal-banner">
      <div className="knight-royal-banner__crest">
        <ShieldCheck size={30} aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.32em]">Order of Awaken</p>
        <h2 className="app-title-font mt-1 text-2xl font-bold text-white sm:text-3xl">
          {rankName}
        </h2>
      </div>
      <div className="knight-royal-banner__seal">
        <span>{renown}</span>
        <small>Renown</small>
      </div>
    </section>
  );
}

function ArcThemePanel() {
  const awaken = useAwakenState();
  const arcTheme = getCurrentArcTheme(awaken.profile.arcThemeId);

  return (
    <Panel variant="medium-vertical">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {arcTheme.labels.arcPanelTitle}
      </p>
      <p className="app-title-font mt-2 text-2xl font-bold text-white">
        {arcTheme.name}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-400">{arcTheme.tagline}</p>
      <label className="mt-5 grid gap-2 text-sm">
        <span className="font-semibold text-slate-300">Theme</span>
        <select
          className="min-h-11 rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60"
          onChange={(event) => awaken.setArcTheme(event.target.value as ArcThemeId)}
          value={awaken.profile.arcThemeId}
        >
          {ARC_THEMES.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="theme-swatch theme-swatch-primary" />
        <span className="theme-swatch theme-swatch-secondary" />
        <span className="theme-swatch theme-swatch-accent" />
        <span className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300">
          Font: {arcTheme.fontLabel}
        </span>
      </div>
    </Panel>
  );
}

export function StatsView() {
  const awaken = useAwakenState();
  const arcTheme = getCurrentArcTheme(awaken.profile.arcThemeId);
  const currentRankId = getRankIdForLevel(awaken.profile.overallLevel);
  const rankName = arcTheme.rankNames[currentRankId] ?? currentRankId;
  const disciplineTier = DISCIPLINE_TIERS.find(
    (tier) => tier.id === awaken.profile.disciplineTierId
  );

  return (
    <PageStack>
      <PageHeader
        eyebrow="Stats"
        title="Character Growth"
        text="Stat levels, XP progress, Discipline multiplier, and rank state."
      />
      <section data-tour="stats-overview" className="grid gap-4 rounded-xl lg:grid-cols-3">
        <Panel variant="compact-box">
          <Metric label="Current Rank" value={rankName} />
          <p className="mt-3 text-sm text-slate-500">
            Overall level {awaken.profile.overallLevel}
          </p>
        </Panel>
        <Panel variant="compact-box">
          <span className="mage-only-stat-icon" aria-hidden="true"><ShieldCheck size={20} /></span>
          <span className="shadow-only-stat-icon" aria-hidden="true"><Link2 size={20} /></span>
          <span className="beserker-only-stat-icon" aria-hidden="true"><Link2 size={20} /></span>
          <span className="muse-only-stat-icon" aria-hidden="true"><Hourglass size={20} /></span>
          <span className="futuristic-only-stat-icon" aria-hidden="true"><ShieldCheck size={20} /></span>
          <Metric
            label="Discipline"
            value={`${disciplineTier?.multiplier.toFixed(2) ?? "1.00"}x`}
          />
          <p className="mt-3 text-sm text-slate-500">
            {disciplineTier?.name} tier, {awaken.profile.disciplineXp} Discipline XP
          </p>
        </Panel>
        <Panel variant="compact-box">
          <Metric label={`Total ${arcTheme.labels.xpName}`} value={awaken.profile.overallXp} />
          <p className="mt-3 text-sm text-slate-500">Combined stat progress</p>
        </Panel>
      </section>
      <RankLadderPanel />
      <StatRadarPanel />
      <div data-tour="stats-growth" className="rounded-xl"><StatGrid /></div>
    </PageStack>
  );
}

function RankLadderPanel() {
  const awaken = useAwakenState();
  const arcTheme = getCurrentArcTheme(awaken.profile.arcThemeId);
  const progress = getRankProgress(
    awaken.profile.overallXp,
    awaken.profile.overallLevel,
    awaken.profile.arcThemeId
  );

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionTitle icon={<Map size={18} />} title="Rank Ladder" />
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Ranks use your combined stat XP. Theme changes rename ranks, but the level and XP milestones stay the same.
          </p>
        </div>
        <span className="rounded-md bg-white/[0.06] px-3 py-2 text-sm font-semibold text-cyan-100">
          {arcTheme.name}: {progress.currentName}
        </span>
      </div>

      <div className="mt-5">
        <ProgressBar
          detail={progress.next
            ? `${progress.remainingXp.toLocaleString()} ${arcTheme.labels.xpName} remaining`
            : "All ranks unlocked"}
          label={progress.next
            ? `Next: ${progress.nextName} · Level ${progress.next.minLevel} · ${progress.nextXp.toLocaleString()} total XP`
            : `${progress.currentName} is the highest rank`}
          value={progress.percent}
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Total XP</th>
              {ARC_THEMES.map((theme) => (
                <th className={theme.id === arcTheme.id ? "text-cyan-100" : ""} key={theme.id}>
                  <span className="block px-4 py-3">{theme.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RANK_THRESHOLDS.map((rank) => {
              const isCurrent = rank.id === progress.current.id;
              return (
                <tr className={`border-t border-white/10 ${isCurrent ? "bg-cyan-300/[0.07]" : ""}`} key={rank.id}>
                  <td className="px-4 py-3 font-semibold text-white">
                    {rank.minLevel}{isCurrent ? <span className="ml-2 text-xs text-cyan-200">Current</span> : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">
                    {getXpRequiredForLevel(rank.minLevel).toLocaleString()}
                  </td>
                  {ARC_THEMES.map((theme) => (
                    <td className={`px-4 py-3 ${theme.id === arcTheme.id ? "font-semibold text-cyan-100" : "text-slate-300"}`} key={theme.id}>
                      {theme.rankNames[rank.id]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function TasksView() {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";

  return (
    <PageStack>
      <PageHeader
        eyebrow={isKnight ? "Duties" : isMage ? "Spells" : isShadowborne ? "Missions" : isBeserker ? "Training" : isMuse ? "Practices" : isFuturistic ? "Protocols" : "Tasks"}
        title={isKnight ? "Duty Logging" : isMage ? "Spellcasting & Rituals" : isShadowborne ? "Mission Control" : isBeserker ? "War Training" : isMuse ? "Creative Practices" : isFuturistic ? "Protocol Console" : "Action Logging"}
        text={
          isKnight
            ? "Log honorable duties and broken vows. This updates Renown, Royal Quests, Sieges, and reports."
            : isMage
              ? "Cast constructive spells and record disrupted rituals. This updates Mana, Arcane Quests, Trials, and divinations."
            : isShadowborne
              ? "Complete missions and track corruption. This updates Power, Story Missions, Final Encounters, and episode records."
            : isBeserker
              ? "Complete brutal training and confront weaknesses. This builds Rage, advances Hunts, and breaks War Challenges."
            : isMuse
              ? "Record nourishing practices and creative blocks. This grows Radiance, Inspirations, Masterpieces, and reflections."
            : isFuturistic
              ? "Execute protocols and diagnose system errors. This builds Charge, advances Operations, and resolves Threat Events."
            : "Log positive tasks and negative actions. This updates XP, quests, bosses, and reports."
        }
      />
      <section className="grid gap-4 rounded-xl lg:grid-cols-2">
        <div data-tour="positive-tasks" className="rounded-xl"><QuickTaskPanel /></div>
        <div data-tour="negative-actions" className="rounded-xl"><NegativeActionPanel /></div>
      </section>
      <ManualTaskPanel />
      <ActivityLogPanel />
    </PageStack>
  );
}

export function QuestsView() {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";

  return (
    <PageStack>
      <PageHeader
        eyebrow={isKnight ? "Royal Quests" : isMage ? "Arcane Quests" : isShadowborne ? "Story Missions" : isBeserker ? "Hunts" : isMuse ? "Inspirations" : isFuturistic ? "Operations" : "Quests"}
        title={isKnight ? "Daily Royal Quest Board" : isMage ? "Daily Incantations" : isShadowborne ? "Daily Objectives" : isBeserker ? "Daily Battle Orders" : isMuse ? "Daily Intentions" : isFuturistic ? "Daily Directives" : "Daily Quest Board"}
        text={
          isKnight
            ? "Generated from your order, weak stats, duties, and recent broken-vow patterns."
            : isMage
              ? "Incantations drawn from your school, low reserves, rituals, and recent magical disruptions."
            : isShadowborne
              ? "Story missions generated from your weakest power, active arc, and recent corruption."
            : isBeserker
              ? "Hunts forged from your warpath, weakest stat, training, and recent weaknesses."
            : isMuse
              ? "Inspirations drawn from your creative path, quiet needs, practices, and recent blocks."
            : isFuturistic
              ? "Operations generated from system priorities, low-capacity modules, protocols, and recent errors."
            : "Generated from your arc, weak stats, tasks, and recent negative patterns."
        }
      />
      <div data-tour="quests-board" className="rounded-xl"><QuestBoard /></div>
    </PageStack>
  );
}

export function BossesView() {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";

  return (
    <PageStack>
      <PageHeader
        eyebrow={isKnight ? "Sieges" : isMage ? "Trials" : isShadowborne ? "Final Encounters" : isBeserker ? "War Challenges" : isMuse ? "Masterpieces" : isFuturistic ? "Threat Events" : "Bosses"}
        title={isKnight ? "Weekly Siege" : isMage ? "Weekly Arcane Trial" : isShadowborne ? "Weekly Final Encounter" : isBeserker ? "Weekly War Challenge" : isMuse ? "Weekly Masterpiece" : isFuturistic ? "Weekly Threat Event" : "Weekly Boss Battle"}
        text={
          isKnight
            ? "Break the weekly siege with matching duties. Broken-vow patterns can reinforce it."
            : isMage
              ? "Unravel the weekly trial with aligned spells. Disrupted rituals can restore its ward."
            : isShadowborne
              ? "Break the final encounter with aligned missions before corruption restores its threat gauge."
            : isBeserker
              ? "Break the war challenge with matching training before your weaknesses restore its strength."
            : isMuse
              ? "Complete the weekly masterpiece through aligned practices before creative blocks soften its momentum."
            : isFuturistic
              ? "Resolve the threat event with aligned protocols before system errors restore its threat integrity."
            : "Damage the weekly boss with matching tasks. Negative action patterns can heal it."
        }
      />
      <div data-tour="boss-panel" className="rounded-xl"><BossPanel /></div>
      <BossCodex />
      <Panel>
        <SectionTitle icon={<Swords size={18} />} title={isKnight ? "Siege History" : isMage ? "Trial Archive" : isShadowborne ? "Encounter Archive" : isBeserker ? "War Archive" : isMuse ? "Finished Works" : isFuturistic ? "Threat Archive" : "Boss History"} />
        {awaken.bossHistory.length === 0 ? (
          <EmptyState text={isKnight ? "No broken or escaped sieges yet." : "No defeated or escaped bosses yet."} />
        ) : (
          <div className="grid gap-3">
            {awaken.bossHistory.map((boss) => (
              <div className="app-card rounded-lg border border-white/10 bg-white/[0.04] p-4" key={boss.id}>
                <p className="font-semibold text-white">{boss.name}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {boss.status} | {STAT_CATEGORY_LABELS[boss.targetStat]}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </PageStack>
  );
}

function BossCodex() {
  const bossCount = STAT_CATEGORIES.reduce(
    (total, stat) => total + WEEKLY_BOSS_ROSTER[stat].length,
    0
  );

  return (
    <Panel>
      <SectionTitle icon={<Skull size={18} />} title="Boss Codex" />
      <p className="mt-2 text-sm leading-6 text-slate-400">
        {bossCount} possible weekly encounters. Your weakest stat chooses the category, then the roster rotates each week.
      </p>
      <details className="app-card app-inset-card mt-4 rounded-lg border border-white/10 bg-white/[0.035] p-4">
        <summary className="cursor-pointer font-semibold text-white">View all {bossCount} weekly bosses</summary>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
          {STAT_CATEGORIES.map((stat) => (
            <section className="rounded-lg border border-white/10 bg-black/15 p-3" key={stat}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
                {STAT_CATEGORY_LABELS[stat]}
              </h3>
              <div className="mt-3 grid gap-3">
                {WEEKLY_BOSS_ROSTER[stat].map((boss) => (
                  <div key={boss.id}>
                    <p className="text-sm font-semibold text-white">{boss.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{boss.description}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </details>
    </Panel>
  );
}

export function ReviewsView() {
  return (
    <PageStack>
      <PageHeader
        eyebrow="Reviews"
        title="Daily and Weekly Reviews"
        text="Reflect on patterns, generate practical System insights, and set the next focus."
      />
      <section data-tour="reviews-overview" className="grid gap-4 rounded-xl lg:grid-cols-2">
        <DailyReviewPanel />
        <DailyInsightPanel />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <WeeklyReportPanel />
        <WeeklyReflectionPanel />
      </section>
    </PageStack>
  );
}

export function AnalyticsView() {
  const awaken = useAwakenState();
  const completed = awaken.completedQuestCount;
  const arcTheme = getCurrentArcTheme(awaken.profile.arcThemeId);
  const statAnalytics = STAT_CATEGORIES.map((stat) => {
    const progress = awaken.profile.stats.find((item) => item.stat === stat);
    const loggedNetXp = awaken.activityLog.reduce((total, event) => {
      if (event.kind === "xp" && event.result.logEntry.stat === stat) {
        return total + event.result.logEntry.xpAmount;
      }
      if (event.kind === "boss_reward" && event.targetStat === stat) {
        return total + event.statXp;
      }
      return total;
    }, 0);

    return {
      stat,
      level: progress?.level ?? 0,
      xp: progress?.currentXp ?? 0,
      loggedNetXp
    };
  });

  return (
    <PageStack>
      <PageHeader
        eyebrow="Analytics"
        title="System Analytics"
        text="See how your stats compare, where your XP is concentrated, and which areas need attention."
      />
      <section data-tour="analytics-overview" className="grid gap-4 rounded-xl md:grid-cols-2 xl:grid-cols-4">
        <Panel>
          <Metric label="Quest Clears" value={completed} />
          <p className="mt-2 text-sm text-slate-500">Today&apos;s completed quests</p>
        </Panel>
        <Panel>
          <Metric label="Activity Events" value={awaken.activityLog.length} />
          <p className="mt-2 text-sm text-slate-500">Recent local events tracked</p>
        </Panel>
        <Panel>
          <Metric label="Boss HP" value={`${awaken.activeBoss.currentHp}/${awaken.activeBoss.maxHp}`} />
          <p className="mt-2 text-sm text-slate-500">Active weekly boss status</p>
        </Panel>
        <Panel>
          <Metric label="Reviews" value={awaken.dailyReviews.length} />
          <p className="mt-2 text-sm text-slate-500">Saved daily reviews</p>
        </Panel>
      </section>
      <Panel>
        <SectionTitle icon={<Activity size={18} />} title="XP Progression" />
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Explore daily gains and penalties from your saved activity. Logging or undoing an action updates this chart automatically.
        </p>
        <XpProgressChart activityLog={awaken.activityLog} xpName={arcTheme.labels.xpName} />
      </Panel>
      <Panel>
        <SectionTitle icon={<Radar size={18} />} title={`${arcTheme.labels.xpName} Radar Map`} />
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          The outer edge represents your strongest stat. The shape updates whenever XP changes, making balance and weak spots easy to see.
        </p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <RadarMap
            ariaLabel="Current Awaken stat XP radar map"
            data={statAnalytics.map((item) => ({
              id: item.stat,
              label: STAT_CATEGORY_LABELS[item.stat],
              value: item.xp,
              displayValue: `${item.xp.toLocaleString()} XP, level ${item.level}`
            }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {statAnalytics.map((item) => (
              <div className="app-card rounded-lg border border-white/10 bg-white/[0.04] p-4" key={item.stat}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-white">{STAT_CATEGORY_LABELS[item.stat]}</p>
                  <span className="rounded-md bg-cyan-300/10 px-2 py-1 text-xs font-semibold text-cyan-100">
                    Lv. {item.level}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-bold text-white">{item.xp.toLocaleString()} <span className="text-sm font-semibold text-slate-400">XP</span></p>
                <p className={`mt-1 text-xs font-semibold ${item.loggedNetXp < 0 ? "text-rose-300" : "text-emerald-300"}`}>
                  {formatSignedNumber(item.loggedNetXp)} net XP in tracked activity
                </p>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </PageStack>
  );
}

function QuickTaskPanel({ compact = false }: Readonly<{ compact?: boolean }>) {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";
  const tasks = compact ? awaken.positiveTasks.slice(0, 4) : awaken.positiveTasks;
  const { loggedId, showLogged } = useTransientLoggedId();

  return (
    <Panel variant="standard-card">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={<Plus size={18} />} title={isKnight ? "Honorable Duties" : isMage ? "Prepared Spells" : isShadowborne ? "Active Missions" : isBeserker ? "Training Drills" : isMuse ? "Creative Practices" : isFuturistic ? "Active Protocols" : "Positive Tasks"} />
        <span className="rounded-md bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
          +{awaken.positiveXpTotal} {isKnight ? "Renown" : isMage ? "Mana" : isShadowborne ? "Power" : isBeserker ? "Rage" : isMuse ? "Radiance" : isFuturistic ? "Charge" : "XP"} logged
        </span>
      </div>
      <div className={`mt-4 grid gap-3 overflow-y-auto pr-1 ${compact ? "max-h-80" : "max-h-[26rem]"}`}>
        {tasks.map((task) => (
          <ActionButton
            key={task.id}
            label={task.title}
            meta={`${STAT_CATEGORY_LABELS[task.stat]} +${awaken.taskXpPreview[task.id]} XP`}
            tone="positive"
            active={loggedId === task.id}
            action="positive"
            onPress={() => showLogged(task.id)}
            paramName="actionId"
            paramValue={task.id}
          />
        ))}
      </div>
    </Panel>
  );
}

function NegativeActionPanel({ compact = false }: Readonly<{ compact?: boolean }>) {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";
  const actions = compact ? awaken.negativeActions.slice(0, 4) : awaken.negativeActions;
  const { loggedId, showLogged } = useTransientLoggedId();

  return (
    <Panel variant="standard-card">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={<Minus size={18} />} title={isKnight ? "Broken Vows" : isMage ? "Disrupted Rituals" : isShadowborne ? "Corruption" : isBeserker ? "Weaknesses" : isMuse ? "Creative Blocks" : isFuturistic ? "System Errors" : "Negative Actions"} />
        <span className="rounded-md bg-rose-300/10 px-2.5 py-1 text-xs font-semibold text-rose-100">
          -{awaken.negativeXpTotal} {isKnight ? "Renown" : isMage ? "Mana" : isShadowborne ? "Power" : isBeserker ? "Rage" : isMuse ? "Radiance" : isFuturistic ? "Charge" : "XP"} logged
        </span>
      </div>
      <div className={`mt-4 grid gap-3 overflow-y-auto pr-1 ${compact ? "max-h-80" : "max-h-[26rem]"}`}>
        {actions.map((action) => (
          <ActionButton
            key={action.id}
            label={action.title}
            meta={`${STAT_CATEGORY_LABELS[action.stat]} -${action.xpPenalty} XP`}
            tone="negative"
            active={loggedId === action.id}
            action="negative"
            onPress={() => showLogged(action.id)}
            paramName="actionId"
            paramValue={action.id}
          />
        ))}
      </div>
    </Panel>
  );
}

type GeminiXpSuggestion = ManualXpEstimate & {
  reason: string;
  source: "gemini";
};

function ManualTaskPanel() {
  const awaken = useAwakenState();
  const [title, setTitle] = useState("");
  const [actionType, setActionType] = useState<"positive" | "negative">("positive");
  const [stat, setStat] = useState<StatCategory>("strength");
  const [manualXp, setManualXp] = useState("");
  const [geminiSuggestion, setGeminiSuggestion] = useState<GeminiXpSuggestion | null>(null);
  const [geminiError, setGeminiError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const xpAnalysis = analyzeManualTaskXp(title, actionType);
  const activeXpAnalysis = geminiSuggestion ?? xpAnalysis;
  const estimatedXp = activeXpAnalysis.xp;
  const manualXpValue = manualXp.trim() ? Math.abs(Number(manualXp)) : undefined;
  const displayXp =
    typeof manualXpValue === "number" && Number.isFinite(manualXpValue)
      ? Math.round(manualXpValue)
      : estimatedXp;

  function updateTitle(value: string) {
    setTitle(value);
    clearGeminiSuggestion();
  }

  function updateActionType(value: "positive" | "negative") {
    setActionType(value);
    clearGeminiSuggestion();
  }

  function clearGeminiSuggestion() {
    setGeminiSuggestion(null);
    setGeminiError("");
  }

  async function analyzeWithGemini() {
    if (title.trim().length < 3 || isAnalyzing) {
      return;
    }

    setIsAnalyzing(true);
    setGeminiError("");

    try {
      const response = await fetch("/api/xp-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), actionType })
      });
      const payload = await response.json() as GeminiXpSuggestion | { error?: string };

      if (!response.ok || !("source" in payload)) {
        throw new Error("error" in payload && payload.error
          ? payload.error
          : "Gemini could not analyze this task.");
      }

      setGeminiSuggestion(payload);
      setStat(payload.suggestedStat);
    } catch (error) {
      setGeminiSuggestion(null);
      setGeminiError(error instanceof Error
        ? error.message
        : "Gemini could not analyze this task. The local estimate is still available.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function saveManualTask() {
    if (!title.trim()) {
      return;
    }

    awaken.recordManualTask({
      title,
      actionType,
      stat,
      xpAmount:
        typeof manualXpValue === "number" && Number.isFinite(manualXpValue)
          ? manualXpValue
          : geminiSuggestion?.xp
    });
    setTitle("");
    setManualXp("");
    clearGeminiSuggestion();
  }

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <SectionTitle icon={<ClipboardPlus size={18} />} title="Manual Task Logger" />
          <p className="mt-2 text-sm text-slate-500">
            Write your own action, choose its type and stat, then use an AI-calibrated estimate or enter exact XP.
          </p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-sm font-bold ${
          actionType === "positive"
            ? "bg-emerald-300/10 text-emerald-100"
            : "bg-rose-300/10 text-rose-100"
        }`}>
          {actionType === "positive" ? "+" : "-"}{displayXp} XP
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
        <TextInputField
          label="Task"
          onChange={updateTitle}
          placeholder="Example: Cleaned my room for 20 minutes"
          value={title}
        />
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-300">Type</span>
          <select
            className="min-h-11 rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60"
            onChange={(event) => updateActionType(event.target.value as "positive" | "negative")}
            value={actionType}
          >
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-300">Category</span>
          <select
            className="min-h-11 rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60"
            onChange={(event) => setStat(event.target.value as StatCategory)}
            value={stat}
          >
            {STAT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {STAT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-300">XP override</span>
          <input
            className="min-h-11 w-full rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60 lg:w-32"
            min="1"
            onChange={(event) => setManualXp(event.target.value)}
            placeholder={`${estimatedXp}`}
            type="number"
            value={manualXp}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          className="primary-button cyan w-full sm:w-auto"
          disabled={isAnalyzing || title.trim().length < 3}
          onClick={analyzeWithGemini}
          type="button"
        >
          <Sparkles className={isAnalyzing ? "animate-pulse" : ""} size={16} />
          {isAnalyzing ? "Analyzing with Gemini..." : "Analyze with Gemini"}
        </button>
        <button className="small-button amber w-full sm:w-auto" onClick={saveManualTask} type="button">
          <Save size={16} /> Save and Log Task
        </button>
      </div>
      {geminiError ? (
        <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          {geminiError} Using the local XP estimate instead.
        </p>
      ) : null}
      <div className="app-card mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">
              XP Calculator
            </p>
            <p className="mt-1 text-sm text-slate-300">
              {manualXp.trim()
                ? "Using your exact XP override."
                : geminiSuggestion
                  ? geminiSuggestion.reason
                  : `${xpAnalysis.archetype} compared against preset tasks.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-200">
              {activeXpAnalysis.confidence}% confidence
            </span>
            <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
              geminiSuggestion
                ? "bg-violet-300/15 text-violet-100"
                : "bg-slate-300/10 text-slate-300"
            }`}>
              {geminiSuggestion ? "Gemini calibrated" : "Local estimate"}
            </span>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
          <p>Suggested stat: {STAT_CATEGORY_LABELS[activeXpAnalysis.suggestedStat]}</p>
          <p>Closest preset: {activeXpAnalysis.nearestPreset}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeXpAnalysis.signals.map((signal) => (
            <span
              className="rounded-md bg-[#080b12] px-2.5 py-1 text-xs text-slate-300"
              key={signal}
            >
              {signal}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function QuestBoard({ preview = false }: Readonly<{ preview?: boolean }>) {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";
  const quests = awaken.dailyQuests;

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle icon={<Flame size={18} />} title={isKnight ? "Royal Quests" : isMage ? "Arcane Quests" : isShadowborne ? "Story Missions" : isBeserker ? "Hunts" : isMuse ? "Inspirations" : isFuturistic ? "Operations" : "Daily Quests"} />
          <p className="mt-1 text-sm text-slate-500">
            {awaken.completedQuestCount} of {awaken.dailyQuests.length} complete for {awaken.questDate}
          </p>
        </div>
      </div>
      {!preview ? (
        <div className="app-card app-inset-card mt-5 rounded-lg border border-white/10 bg-white/[0.035] p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">How today&apos;s quest list works</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Log the linked task from Tasks or complete it here. Either path awards the XP displayed on the quest exactly once.
              </p>
            </div>
            <span className="mt-2 w-fit rounded-md bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100 sm:mt-0">
              4 cleared: +50 Discipline · 5 cleared: +100 more
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {dailyQuestGuide.map((item) => (
              <div className="rounded-md border border-white/10 bg-black/15 p-3" key={item.name}>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">{item.name}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{item.purpose}</p>
                <p className="mt-2 text-xs font-semibold text-slate-200">{item.reward}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      <div className={`mt-4 grid gap-3 ${preview ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
        {quests.map((quest) => (
          <form className="contents" key={quest.id} method="GET">
            <input
              name="awakenAction"
              type="hidden"
              value={quest.completed ? "uncomplete-quest" : "quest"}
            />
            <input name="questId" type="hidden" value={quest.id} />
            <button
            className={`quest-card ${isMage && quest.questType === "main" ? "quest-scroll" : ""} ${isShadowborne ? "manga-mission" : ""} w-full rounded-lg border p-4 text-left transition ${
              quest.completed
                ? "border-emerald-300/25 bg-emerald-300/10"
                : "border-white/10 bg-white/[0.04] hover:border-amber-200/50 hover:bg-amber-300/10"
            }`}
            type="submit"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
                  {isKnight ? formatRoyalQuestType(quest.questType) : isBeserker ? formatHuntType(quest.questType) : isMuse ? formatInspirationType(quest.questType) : isFuturistic ? formatOperationType(quest.questType) : formatQuestType(quest.questType)}
                </p>
                <h2 className="mt-1 font-semibold text-white">{quest.title}</h2>
              </div>
              <span className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold ${
                quest.completed
                  ? "bg-emerald-300/10 text-emerald-100"
                  : "bg-amber-300/10 text-amber-100"
              }`}>
                {quest.completed ? <CheckCircle2 size={14} /> : null}
                {quest.completed ? "Undo" : `Complete +${quest.xpReward} XP`}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{quest.description}</p>
            <div className="mt-3 rounded-md border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-2">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-cyan-200">Required action</p>
              <p className="mt-1 text-sm font-semibold text-slate-100">
                {quest.linkedTaskId ? getTaskTitle(quest.linkedTaskId, awaken.positiveTasks) : quest.description}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Log this action from Tasks or press Complete here. The quest finishes after this one action is recorded.
              </p>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Target: {STAT_CATEGORY_LABELS[quest.targetStat]}
            </p>
            </button>
          </form>
        ))}
      </div>
    </Panel>
  );
}

function BossPanel({ compact = false }: Readonly<{ compact?: boolean }>) {
  const awaken = useAwakenState();
  const isKnight = awaken.profile.arcThemeId === "knight";
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";
  const boss = awaken.activeBoss;

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle icon={<Swords size={18} />} title={isKnight ? "Weekly Siege" : isMage ? "Weekly Trial" : isShadowborne ? "Final Encounter" : isBeserker ? "War Challenge" : isMuse ? "Masterpiece" : isFuturistic ? "Threat Event" : "Weekly Boss"} />
          <p className="mt-1 text-sm text-slate-500">
            {boss.weekStartDate} to {boss.weekEndDate}
          </p>
        </div>
      </div>
      <div className="boss-contract mt-4 rounded-lg border border-red-300/20 bg-red-300/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{boss.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{boss.description}</p>
          </div>
          <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${getBossStatusClass(boss.status)}`}>
            {boss.status}
          </span>
        </div>
        <div className="mt-5">
            <ProgressBar
            detail={`${boss.currentHp} / ${boss.maxHp}`}
            label={isKnight ? "Siege HP" : isMage ? "Trial Ward" : isShadowborne ? "Threat Gauge" : isBeserker ? "War Challenge" : isMuse ? "Creative Flow" : isFuturistic ? "Threat Integrity" : "Boss HP"}
            value={Math.round((boss.currentHp / boss.maxHp) * 100)}
          />
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Target: {STAT_CATEGORY_LABELS[boss.targetStat]}
        </p>
      </div>
      {!compact ? (
        <>
          <LinkedList title={isKnight ? "Strike duties" : isBeserker ? "Damage training" : isMuse ? "Shaping practices" : isFuturistic ? "Countermeasure protocols" : "Damage tasks"} ids={boss.damageTaskIds} lookup={(taskId) => getTaskTitle(taskId, awaken.positiveTasks)} />
          <LinkedList title={isKnight ? "Reinforcing broken vows" : isBeserker ? "Strengthening weaknesses" : isMuse ? "Creative blocks" : isFuturistic ? "Integrity-restoring errors" : "Healing actions"} ids={boss.healingNegativeActionIds} lookup={getNegativeActionTitle} />
          <div className="app-card mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
            Rewards: +{boss.rewards.statXp} {STAT_CATEGORY_LABELS[boss.targetStat]} XP, +{boss.rewards.disciplineXp} Discipline XP
            {boss.rewards.titleUnlock ? `, ${boss.rewards.titleUnlock}` : ""}
          </div>
          {boss.status === "defeated" ? (
            <div className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-semibold text-emerald-100">
              Boss defeated · rewards claimed automatically
            </div>
          ) : null}
        </>
      ) : null}
    </Panel>
  );
}

function StatRadarPanel() {
  const awaken = useAwakenState();
  const statLevels = STAT_CATEGORIES.map((stat) => {
    const statProgress = awaken.profile.stats.find((item) => item.stat === stat);

    return {
      stat,
      level: statProgress?.level ?? 0,
      xp: statProgress?.currentXp ?? 0
    };
  });
  return (
    <Panel>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr] lg:items-center">
        <RadarMap
          ariaLabel="Current stat level radar map"
          data={statLevels.map((item) => ({
            id: item.stat,
            label: STAT_CATEGORY_LABELS[item.stat],
            value: item.level,
            displayValue: `Level ${item.level}, ${item.xp.toLocaleString()} XP`
          }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {statLevels.map((item) => (
            <div className="app-card rounded-lg border border-white/10 bg-white/[0.04] p-4" key={item.stat}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {STAT_CATEGORY_LABELS[item.stat]}
              </p>
              <p className="mt-2 text-lg font-bold text-white">
                Lv. {item.level} · {item.xp} XP
              </p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function StatGrid() {
  const awaken = useAwakenState();
  const isMage = awaken.profile.arcThemeId === "mage";
  const isShadowborne = awaken.profile.arcThemeId === "anime_dark";
  const isBeserker = awaken.profile.arcThemeId === "berserker";
  const isMuse = awaken.profile.arcThemeId === "muse";
  const isFuturistic = awaken.profile.arcThemeId === "futuristic";

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {STAT_CATEGORIES.map((stat) => {
        const statProgress = awaken.profile.stats.find((item) => item.stat === stat);
        const level = statProgress?.level ?? 0;
        const xp = statProgress?.currentXp ?? 0;
        const progress = getLevelProgress(xp, level);
        const Icon = isMage ? mageStatIcons[stat] : isShadowborne ? shadowStatIcons[stat] : isBeserker ? beserkerStatIcons[stat] : isMuse ? museStatIcons[stat] : isFuturistic ? futuristicStatIcons[stat] : statIcons[stat];

        return (
          <Panel key={stat} variant="square-card">
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <Icon size={22} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              {STAT_CATEGORY_LABELS[stat]}
            </p>
            <p className="mt-3 text-3xl font-bold text-white">Lv. {level}</p>
            <p className="mt-1 text-sm text-slate-500">{xp} XP</p>
            <div className="mt-5">
              <ProgressBar
                detail={`${progress.current} / ${progress.needed}`}
                label="Next level"
                value={progress.percent}
              />
            </div>
          </Panel>
        );
      })}
    </section>
  );
}

function ActivityLogPanel() {
  const awaken = useAwakenState();

  return (
    <Panel>
      <SectionTitle icon={<Activity size={18} />} title="Recent XP Activity" />
      {awaken.activityLog.length === 0 ? (
        <EmptyState text="No XP events yet." />
      ) : (
        <div className="mt-4 grid gap-3">
          {awaken.activityLog.map((event) => (
            <div className="app-card rounded-lg border border-white/10 bg-white/[0.04] p-4" key={event.id}>
              <ActivityLogRow event={event} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DailyReviewPanel() {
  const awaken = useAwakenState();
  const [isEditing, setIsEditing] = useState(!awaken.todayReview);
  const [draft, setDraft] = useState<DailyReviewDraft>(() =>
    createReviewDraft(awaken.todayReview)
  );

  function save() {
    awaken.saveDailyReview(draft);
    setIsEditing(false);
  }

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle icon={<BookOpen size={18} />} title="Daily Review" />
          <p className="mt-1 text-sm text-slate-500">{awaken.today}</p>
        </div>
        {awaken.todayReview && !isEditing ? (
          <button className="small-button cyan" onClick={() => setIsEditing(true)} type="button">
            Edit Review
          </button>
        ) : null}
      </div>
      <div className="mt-4">
        {awaken.todayReview && !isEditing ? (
          <SavedReview review={awaken.todayReview} />
        ) : (
          <DailyReviewForm draft={draft} onChange={setDraft} onSave={save} />
        )}
      </div>
    </Panel>
  );
}

function DailyInsightPanel() {
  const awaken = useAwakenState();

  return (
    <Panel>
      <SectionTitle icon={<Sparkles size={18} />} title="System Insight" />
      <div className="mt-4">
        {awaken.todayInsight ? (
          <div className="rounded-lg border border-violet-300/20 bg-violet-300/10 p-5">
            <p className="text-sm leading-7 text-violet-50">{awaken.todayInsight.summary}</p>
          </div>
        ) : (
          <EmptyState text="Save today's review to generate the System insight." />
        )}
      </div>
    </Panel>
  );
}

function WeeklyReportPanel() {
  const awaken = useAwakenState();

  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div>
          <SectionTitle icon={<CalendarDays size={18} />} title="Weekly System Report" />
          <p className="mt-1 text-sm text-slate-500">
            {awaken.currentWeek.weekStartDate} to {awaken.currentWeek.weekEndDate}
          </p>
        </div>
      </div>
      <div className="mt-4">
        {awaken.currentWeeklyReport ? (
          <WeeklyReportView report={awaken.currentWeeklyReport} />
        ) : (
          <EmptyState text="No weekly report generated yet." />
        )}
      </div>
    </Panel>
  );
}

function WeeklyReflectionPanel() {
  const awaken = useAwakenState();
  const [draft, setDraft] = useState<WeeklyReflectionDraft>(() =>
    createWeeklyReflectionDraft(awaken.currentWeeklyReflection)
  );

  return (
    <Panel>
      <SectionTitle icon={<BookOpen size={18} />} title="Weekly Reflection" />
      <div className="mt-4">
        <WeeklyReflectionForm
          draft={draft}
          onChange={setDraft}
          onSave={() => awaken.saveWeeklyReport(draft)}
        />
      </div>
    </Panel>
  );
}

function DailyReviewForm({
  draft,
  onChange,
  onSave
}: Readonly<{
  draft: DailyReviewDraft;
  onChange: (draft: DailyReviewDraft) => void;
  onSave: () => void;
}>) {
  return (
    <div className="grid gap-4">
      <TextAreaField label="What was your biggest win today?" value={draft.biggestWin} onChange={(value) => onChange({ ...draft, biggestWin: value })} />
      <TextAreaField label="What was your biggest mistake today?" value={draft.biggestMistake} onChange={(value) => onChange({ ...draft, biggestMistake: value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberSelect label="Energy level" value={draft.energyLevel} onChange={(value) => onChange({ ...draft, energyLevel: value })} />
        <NumberSelect label="Mood level" value={draft.moodLevel} onChange={(value) => onChange({ ...draft, moodLevel: value })} />
      </div>
      <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
        <input
          checked={draft.hadNegativeAction}
          className="h-4 w-4 accent-cyan-300"
          onChange={(event) =>
            onChange({ ...draft, hadNegativeAction: event.target.checked })
          }
          type="checkbox"
        />
        Did any negative action happen today?
      </label>
      {draft.hadNegativeAction ? (
        <label className="grid gap-2 text-sm">
          <span className="font-semibold text-slate-300">Why did it happen?</span>
          <select
            className="min-h-11 rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60"
            onChange={(event) =>
              onChange({ ...draft, negativeActionReason: event.target.value as ReviewNegativeActionReason })
            }
            value={draft.negativeActionReason}
          >
            <option value="">Select a reason</option>
            {negativeActionReasonOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ) : null}
      <TextAreaField label="What should tomorrow's main focus be?" value={draft.tomorrowFocus} onChange={(value) => onChange({ ...draft, tomorrowFocus: value })} />
      <button className="primary-button cyan" onClick={onSave} type="button">
        <Save size={16} /> Save Review
      </button>
    </div>
  );
}

function WeeklyReflectionForm({
  draft,
  onChange,
  onSave
}: Readonly<{
  draft: WeeklyReflectionDraft;
  onChange: (draft: WeeklyReflectionDraft) => void;
  onSave: () => void;
}>) {
  return (
    <div className="grid gap-4">
      <TextAreaField label="Biggest win this week" value={draft.biggestWin} onChange={(value) => onChange({ ...draft, biggestWin: value })} />
      <TextAreaField label="Biggest setback this week" value={draft.biggestSetback} onChange={(value) => onChange({ ...draft, biggestSetback: value })} />
      <TextAreaField label="What did you learn?" value={draft.lessonLearned} onChange={(value) => onChange({ ...draft, lessonLearned: value })} />
      <TextAreaField label="What should next week's main focus be?" value={draft.nextWeekFocus} onChange={(value) => onChange({ ...draft, nextWeekFocus: value })} />
      <button className="primary-button amber" onClick={onSave} type="button">
        <Save size={16} /> Save Weekly Report
      </button>
    </div>
  );
}

function SavedReview({ review }: Readonly<{ review: DailyReview }>) {
  return (
    <div className="grid gap-3">
      <ReviewLine label="Biggest win" value={review.biggestWin} />
      <ReviewLine label="Biggest mistake" value={review.biggestMistake} />
      <ReviewLine label="Energy" value={`${review.energyLevel}/10`} />
      <ReviewLine label="Mood" value={`${review.moodLevel}/10`} />
      <ReviewLine
        label="Negative action"
        value={review.hadNegativeAction ? getReviewReasonLabel(review.negativeActionReason) : "None logged in review"}
      />
      <ReviewLine label="Tomorrow focus" value={review.tomorrowFocus} />
    </div>
  );
}

function WeeklyReportView({ report }: Readonly<{ report: WeeklyReport }>) {
  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-5">
        <p className="text-sm leading-7 text-amber-50">{report.summary}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricTile label="XP gained" value={report.totalXpGained} />
        <MetricTile label="XP lost" value={report.totalXpLost} />
        <MetricTile label="Net XP" value={report.netXp} />
        <MetricTile label="Quest clear rate" value={`${report.dailyQuestCompletionRate}%`} />
        <MetricTile label="Boss result" value={report.weeklyBossStatus} />
        <MetricTile label="Boss damage" value={report.bossDamageDealt} />
      </div>
      <ReviewLine label="Recommended next focus" value={report.recommendedNextFocus} />
    </div>
  );
}

function ActivityLogRow({ event }: Readonly<{ event: ActivityEvent }>) {
  if (event.kind === "discipline_bonus") {
    return (
      <TwoColumn
        title={event.name}
        text={`${event.completedQuestCount} daily quests completed`}
        meta={`${event.xpAmount > 0 ? "+" : ""}${event.xpAmount} Discipline XP`}
      />
    );
  }
  if (event.kind === "boss") {
    return <TwoColumn title={event.name} text={event.message} meta="Boss" />;
  }
  if (event.kind === "boss_reward") {
    return <TwoColumn title={event.name} text={event.titleUnlock ?? "Weekly title unlocked"} meta={`+${event.statXp} XP`} />;
  }
  return (
    <TwoColumn
      title={event.name}
      text={`${STAT_CATEGORY_LABELS[event.result.affectedStat]} Lv. ${event.result.oldStatLevel} to ${event.result.newStatLevel}`}
      meta={`${event.result.xpChanged > 0 ? "+" : ""}${event.result.xpChanged} XP`}
    />
  );
}

function PageStack({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="app-page-stack mx-auto flex max-w-7xl flex-col gap-5">{children}</div>;
}

function PageHeader({
  eyebrow,
  title,
  text
}: Readonly<{ eyebrow: string; title: string; text: string }>) {
  const awaken = useAwakenState();

  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
          {eyebrow}
        </p>
        <h1 className="app-title-font mt-2 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">{text}</p>
      </div>
      <button className="small-button red" onClick={awaken.resetProgress} type="button">
        Reset Progress
      </button>
    </header>
  );
}

function Panel({
  children,
  variant = "large-horizontal"
}: Readonly<{ children: React.ReactNode; variant?: KnightFrameVariant }>) {
  return (
    <KnightFrame
      as="section"
      className="app-panel rounded-lg border border-white/10 bg-[#111827]/80 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
      variant={variant}
    >
      {children}
    </KnightFrame>
  );
}

function SectionTitle({ icon, title }: Readonly<{ icon: React.ReactNode; title: string }>) {
  return (
    <div className="app-section-title app-accent-text flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-200">
      <span className="app-section-title__flourish" aria-hidden="true" />
      <span className="app-section-title__icon">{icon}</span>
      <span>{title}</span>
      <span className="app-section-title__flourish app-section-title__flourish--end" aria-hidden="true" />
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="app-metric" data-metric={label.toLowerCase()}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function MetricTile({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="app-card app-inset-card rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{value}</p>
    </div>
  );
}

function ProgressBar({ label, value, detail }: Readonly<{ label: string; value: number; detail: string }>) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>{label}</span>
        <span>{detail}</span>
      </div>
      <div className="mana-track h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className="mana-fill h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-300" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

function useTransientLoggedId() {
  const [loggedId, setLoggedId] = useState<string | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function showLogged(id: string) {
    setLoggedId(id);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setLoggedId(null);
      timeoutRef.current = null;
    }, 850);
  }

  return { loggedId, showLogged };
}

function ActionButton({
  label,
  meta,
  tone,
  active = false,
  action,
  onPress,
  paramName,
  paramValue
}: Readonly<{
  label: string;
  meta: string;
  tone: "positive" | "negative";
  active?: boolean;
  action: string;
  onPress: () => void;
  paramName: string;
  paramValue: string;
}>) {
  const toneClasses =
    tone === "positive"
      ? active
        ? "border-emerald-200/60 bg-emerald-300/15"
        : "border-emerald-300/20 hover:border-emerald-200/50 hover:bg-emerald-300/10"
      : active
        ? "border-rose-200/60 bg-rose-300/15"
        : "border-rose-300/20 hover:border-rose-200/50 hover:bg-rose-300/10";

  return (
    <form className="contents" method="GET">
      <input name="awakenAction" type="hidden" value={action} />
      <input name={paramName} type="hidden" value={paramValue} />
      <button
        className={`action-button action-button--${tone} ${active ? "is-active" : ""} flex min-h-14 w-full items-center justify-between gap-4 rounded-lg border bg-white/[0.03] px-4 py-3 text-left transition ${toneClasses}`}
        onClick={onPress}
        type="submit"
      >
        <span className="flex min-w-0 items-center gap-2 font-medium text-white">
          {active ? <CheckCircle2 className="shrink-0 text-emerald-100" size={16} /> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-sm text-slate-400">{active ? "Logged" : meta}</span>
      </button>
    </form>
  );
}

function TextInputField({
  label,
  value,
  placeholder,
  onChange
}: Readonly<{
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}>) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <input
        className="min-h-11 rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: Readonly<{ label: string; value: string; onChange: (value: string) => void }>) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <textarea className="min-h-24 resize-y rounded-md border border-white/10 bg-[#080b12] px-3 py-2 text-slate-100 outline-none focus:border-cyan-200/60" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function NumberSelect({ label, value, onChange }: Readonly<{ label: string; value: number; onChange: (value: number) => void }>) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-semibold text-slate-300">{label}</span>
      <select className="min-h-11 rounded-md border border-white/10 bg-[#080b12] px-3 text-slate-100 outline-none focus:border-cyan-200/60" onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {Array.from({ length: 10 }, (_, index) => index + 1).map((level) => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    </label>
  );
}

function ReviewLine({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="app-card app-inset-card rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-200">{value}</p>
    </div>
  );
}

function TwoColumn({ title, text, meta }: Readonly<{ title: string; text: string; meta: string }>) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-400">{text}</p>
      </div>
      <span className="rounded-md bg-white/[0.06] px-2.5 py-1 text-sm font-bold text-cyan-100">{meta}</span>
    </div>
  );
}

function LinkedList({ title, ids, lookup }: Readonly<{ title: string; ids: string[]; lookup: (id: string) => string }>) {
  return (
    <div className="app-card app-inset-card mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ids.map((id) => (
          <span className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-slate-300" key={id}>{lookup(id)}</span>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ text }: Readonly<{ text: string }>) {
  return (
    <div className="app-card app-inset-card mt-4 rounded-lg border border-dashed border-white/10 bg-white/[0.03] p-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

function getRankProgress(totalXp: number, level: number, themeId: ArcThemeId) {
  const theme = getCurrentArcTheme(themeId);
  const currentIndex = RANK_THRESHOLDS.reduce(
    (matchedIndex, rank, index) => level >= rank.minLevel ? index : matchedIndex,
    0
  );
  const current = RANK_THRESHOLDS[currentIndex] ?? RANK_THRESHOLDS[0];
  const next = RANK_THRESHOLDS[currentIndex + 1];

  if (!current) {
    throw new Error("Awaken requires at least one rank threshold.");
  }

  const currentXp = getXpRequiredForLevel(current.minLevel);
  const nextXp = next ? getXpRequiredForLevel(next.minLevel) : currentXp;
  const rankSpan = Math.max(1, nextXp - currentXp);
  const earnedInRank = Math.max(0, totalXp - currentXp);

  return {
    current,
    next,
    currentName: theme.rankNames[current.id],
    nextName: next ? theme.rankNames[next.id] : undefined,
    nextXp,
    remainingXp: next ? Math.max(0, nextXp - totalXp) : 0,
    percent: next ? Math.min(100, Math.round((earnedInRank / rankSpan) * 100)) : 100
  };
}

function getLevelProgress(totalXp: number, level: number) {
  const currentLevelXp = getXpRequiredForLevel(level);
  const nextLevelXp = getXpRequiredForLevel(level + 1);
  const current = Math.max(0, totalXp - currentLevelXp);
  const needed = Math.max(1, nextLevelXp - currentLevelXp);

  return { current, needed, percent: Math.round((current / needed) * 100) };
}

function getCurrentArcTheme(arcThemeId: ArcThemeId) {
  return ARC_THEMES.find((theme) => theme.id === arcThemeId) ?? ARC_THEMES[0];
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function formatQuestType(questType: string) {
  return `${questType.charAt(0).toUpperCase()}${questType.slice(1)} Quest`;
}

function formatRoyalQuestType(questType: string) {
  return `${questType.charAt(0).toUpperCase()}${questType.slice(1)} Royal Quest`;
}

function formatHuntType(questType: string) {
  return `${questType.charAt(0).toUpperCase()}${questType.slice(1)} Hunt`;
}

function formatInspirationType(questType: string) {
  return `${questType.charAt(0).toUpperCase()}${questType.slice(1)} Inspiration`;
}

function formatOperationType(questType: string) {
  return `${questType.charAt(0).toUpperCase()}${questType.slice(1)} Operation`;
}

function getTaskTitle(taskId: string, tasks = PRESET_POSITIVE_TASKS) {
  return tasks.find((task) => task.id === taskId)?.title ?? taskId;
}

function getNegativeActionTitle(actionId: string) {
  return PRESET_NEGATIVE_ACTIONS.find((action) => action.id === actionId)?.title ?? actionId;
}

function getBossStatusClass(status: WeeklyBoss["status"]) {
  if (status === "defeated") return "bg-emerald-300/15 text-emerald-100";
  if (status === "escaped") return "bg-slate-300/10 text-slate-300";
  return "bg-red-300/15 text-red-100";
}

function getReviewReasonLabel(reason?: ReviewNegativeActionReason) {
  if (!reason) return "Reason not selected";
  return negativeActionReasonOptions.find((option) => option.value === reason)?.label ?? "Other";
}
