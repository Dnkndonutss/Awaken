"use client";

import { useEffect, useRef, useState } from "react";
import { ARC_THEMES, STAT_CATEGORY_LABELS } from "@/data/awaken-constants";
import { useAwakenState } from "@/hooks/use-awaken-state";
import type { ArcTheme, DailyQuest, WeeklyBoss } from "@/types/awaken";

type CelebrationKind = "quest" | "boss" | "level";

export type Celebration = {
  id: string;
  kind: CelebrationKind;
  symbol: string;
  title: string;
  message: string;
};

export type CelebrationSnapshot = {
  level: number;
  quests: DailyQuest[];
  boss: WeeklyBoss;
};

const levelUpPresentations: Record<ArcTheme["id"], { symbol: string; title: string; message: string }> = {
  minimal: { symbol: "↑", title: "Level increased", message: "Your system has grown stronger." },
  knight: { symbol: "♛", title: "Renown ascended", message: "Stand taller. Your legend advances." },
  mage: { symbol: "✦", title: "Arcane ascension", message: "New power answers your call." },
  anime_dark: { symbol: "◆", title: "Awakening level", message: "The shadow does not own me. It answers to me." },
  berserker: { symbol: "⚔", title: "Rage ascension", message: "Strength is forged one victory at a time." },
  muse: { symbol: "❀", title: "A new bloom", message: "Your next chapter unfolds." },
  futuristic: { symbol: "◈", title: "Clearance upgraded", message: "Neural capacity synchronized." }
};

export function buildCelebrations(
  previous: CelebrationSnapshot,
  current: CelebrationSnapshot,
  theme: ArcTheme
) {
  const celebrations: Celebration[] = [];
  const previouslyCompleted = new Set(
    previous.quests.filter((quest) => quest.completed).map((quest) => quest.id)
  );

  for (const quest of current.quests) {
    if (quest.completed && !previouslyCompleted.has(quest.id)) {
      celebrations.push({
        id: `quest:${quest.id}:${quest.completedAt ?? "completed"}`,
        kind: "quest",
        symbol: "✓",
        title: `${theme.labels.questName} complete`,
        message: `${quest.title} cleared · +${quest.xpReward} ${theme.labels.xpName}`
      });
    }
  }

  if (
    current.boss.id === previous.boss.id &&
    previous.boss.status !== "defeated" &&
    current.boss.status === "defeated"
  ) {
    celebrations.push({
      id: `boss:${current.boss.id}`,
      kind: "boss",
      symbol: "⚔",
      title: `${current.boss.name} defeated`,
      message: `Rewards claimed automatically · +${current.boss.rewards.statXp} ${STAT_CATEGORY_LABELS[current.boss.targetStat]} XP · +${current.boss.rewards.disciplineXp} Discipline XP`
    });
  }

  if (current.level > previous.level) {
    const presentation = levelUpPresentations[theme.id];
    celebrations.push({
      id: `level:${current.level}`,
      kind: "level",
      symbol: presentation.symbol,
      title: `${presentation.title} ${current.level}`,
      message: presentation.message
    });
  }

  return celebrations;
}

export function AwakenCelebrations() {
  const awaken = useAwakenState();
  const theme = ARC_THEMES.find((item) => item.id === awaken.profile.arcThemeId) ?? ARC_THEMES[0];
  const previousRef = useRef<CelebrationSnapshot>({
    level: awaken.profile.overallLevel,
    quests: awaken.dailyQuests,
    boss: awaken.activeBoss
  });
  const [queue, setQueue] = useState<Celebration[]>([]);
  const active = queue[0];

  useEffect(() => {
    if (!theme) return;
    const currentSnapshot: CelebrationSnapshot = {
      level: awaken.profile.overallLevel,
      quests: awaken.dailyQuests,
      boss: awaken.activeBoss
    };
    const additions = buildCelebrations(previousRef.current, currentSnapshot, theme);
    previousRef.current = currentSnapshot;

    if (additions.length > 0) {
      setQueue((existing) => {
        const existingIds = new Set(existing.map((item) => item.id));
        return [...existing, ...additions.filter((item) => !existingIds.has(item.id))];
      });
    }
  }, [awaken.activeBoss, awaken.dailyQuests, awaken.profile.overallLevel, theme]);

  useEffect(() => {
    if (!active) return;
    const timeoutId = window.setTimeout(() => {
      setQueue((existing) => existing.slice(1));
    }, 2_800);

    return () => window.clearTimeout(timeoutId);
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-live="polite"
      className={`theme-level-up theme-level-up--${awaken.profile.arcThemeId.replace("_", "-")} theme-level-up--${active.kind}`}
      key={active.id}
      role="status"
    >
      <span className="theme-level-up__symbol" aria-hidden="true">{active.symbol}</span>
      <p>{active.title}</p>
      <strong className="theme-level-up__message">{active.message}</strong>
    </div>
  );
}
