"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { awakenRepository } from "@/lib/persistence/repository";
import {
  MAIN_ARCS,
  MANUAL_XP_LIMITS,
  PRESET_NEGATIVE_ACTIONS,
  PRESET_POSITIVE_TASKS,
  ARC_THEMES,
  STAT_CATEGORY_LABELS
} from "@/data/awaken-constants";
import { starterUserProfile } from "@/data/starter-awaken-profile";
import {
  BOSS_DAMAGE_PER_TASK,
  damageBossForTask,
  generateWeeklyBoss,
  getCurrentWeekRange,
  healBossForNegativeAction,
  isBossForCurrentWeek
} from "@/lib/boss-engine";
import { generateDailyInsight } from "@/lib/insight-engine";
import {
  completeQuestsForTask,
  generateDailyQuests,
  getCompletedQuestCount,
  getTodayQuestDate,
  QUEST_BONUS_FIVE_COMPLETE_XP,
  QUEST_BONUS_FOUR_COMPLETE_XP
} from "@/lib/quest-engine";
import { generateWeeklyReport } from "@/lib/weekly-report-engine";
import {
  applyManualXp,
  calculatePositiveTaskXp,
  logNegativeAction,
  logPositiveTask
} from "@/lib/xp-engine";
import type {
  DailyInsight,
  DailyQuest,
  DailyReview,
  NegativeAction,
  PositiveTask,
  ReviewNegativeActionReason,
  ArcThemeId,
  StatCategory,
  UserProfile,
  WeeklyBoss,
  WeeklyReflection,
  WeeklyReport,
  XPChangeResult
} from "@/types/awaken";

export type ActivityEvent =
  | {
      id: string;
      name: string;
      kind: "xp";
      result: XPChangeResult;
    }
  | {
      id: string;
      name: string;
      kind: "discipline_bonus";
      xpAmount: number;
      completedQuestCount: number;
      createdAt: string;
    }
  | {
      id: string;
      name: string;
      kind: "boss";
      message: string;
      combatType: "damage" | "healing";
      hpAmount: number;
      createdAt: string;
    }
  | {
      id: string;
      name: string;
      kind: "boss_reward";
      statXp: number;
      disciplineXp: number;
      targetStat: StatCategory;
      titleUnlock?: string;
      createdAt: string;
    };

export type AwakenState = {
  profile: UserProfile;
  activityLog: ActivityEvent[];
  customPositiveTasks: PositiveTask[];
  customNegativeActions: NegativeAction[];
  dailyQuests: DailyQuest[];
  questDate: string;
  awardedQuestBonusMilestones: number[];
  activeBoss: WeeklyBoss;
  bossHistory: WeeklyBoss[];
  dailyReviews: DailyReview[];
  dailyInsights: DailyInsight[];
  weeklyReports: WeeklyReport[];
  weeklyReflections: WeeklyReflection[];
};

export type DailyReviewDraft = {
  biggestWin: string;
  biggestMistake: string;
  energyLevel: number;
  moodLevel: number;
  hadNegativeAction: boolean;
  negativeActionReason: ReviewNegativeActionReason | "";
  tomorrowFocus: string;
};

export type WeeklyReflectionDraft = {
  biggestWin: string;
  biggestSetback: string;
  lessonLearned: string;
  nextWeekFocus: string;
};

const AWAKEN_STORAGE_KEY = "awaken:dashboard-state:v2";
const LEGACY_STORAGE_KEYS = ["awaken:mvp-dashboard-state:v1"];

type ManualTaskInput = {
  title: string;
  actionType: "positive" | "negative";
  stat: StatCategory;
  xpAmount?: number;
};

export type ManualXpEstimate = {
  xp: number;
  confidence: number;
  suggestedStat: StatCategory;
  archetype: string;
  nearestPreset: string;
  signals: string[];
};

type AwakenStore = ReturnType<typeof useAwakenStateModel>;

const AwakenStateContext = createContext<AwakenStore | null>(null);

export function AwakenStateProvider({
  children
}: Readonly<{ children: ReactNode }>) {
  const awaken = useAwakenStateModel();

  return createElement(
    AwakenStateContext.Provider,
    { value: awaken },
    children
  );
}

export function useAwakenState() {
  const context = useContext(AwakenStateContext);

  if (!context) {
    throw new Error("useAwakenState must be used inside AwakenStateProvider");
  }

  return context;
}

function useAwakenStateModel() {
  const [state, setState] = useState<AwakenState>(createStarterState);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saved" | "saving" | "offline" | "error" | "conflict">("loading");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [legacyCandidate, setLegacyCandidate] = useState<AwakenState | null>(null);
  const [migrationConflict, setMigrationConflict] = useState(false);
  const [requiresOnboarding, setRequiresOnboarding] = useState(false);
  const stateRef = useRef(state);
  const revisionRef = useRef(0);
  const pendingSaveRef = useRef<AwakenState | null>(null);
  const saveInFlightRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const pathname = usePathname();
  const today = getTodayQuestDate();
  const currentWeek = getCurrentWeekRange();

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const derived = useMemo(() => {
    const positiveTasks = [...PRESET_POSITIVE_TASKS, ...state.customPositiveTasks];
    const negativeActions = [
      ...PRESET_NEGATIVE_ACTIONS,
      ...state.customNegativeActions
    ];
    const taskXpPreview = positiveTasks.reduce<Record<string, number>>(
      (preview, task) => {
        preview[task.id] = calculatePositiveTaskXp(
          task.baseXp,
          state.profile.disciplineTierId
        );
        return preview;
      },
      {}
    );

    return {
      today,
      currentWeek,
      positiveTasks,
      negativeActions,
      taskXpPreview,
      completedQuestCount: getCompletedQuestCount(state.dailyQuests),
      positiveXpTotal: getXpTotal(state.activityLog, "positive"),
      negativeXpTotal: getXpTotal(state.activityLog, "negative"),
      todayReview: state.dailyReviews.find((review) => review.date === today),
      todayInsight: state.dailyInsights.find((insight) => insight.date === today),
      currentWeeklyReport: state.weeklyReports.find(
        (report) => report.weekStartDate === currentWeek.weekStartDate
      ),
      currentWeeklyReflection: state.weeklyReflections.find(
        (reflection) => reflection.weekStartDate === currentWeek.weekStartDate
      )
    };
  }, [state, today, currentWeek]);

  function commit(nextState: AwakenState) {
    stateRef.current = nextState;
    setState(nextState);
    queueCloudSave(nextState);
  }

  function queueCloudSave(nextState: AwakenState) {
    setSyncStatus(navigator.onLine ? "saving" : "offline");
    saveState(nextState); // recovery/outbox copy; never treated as authoritative
    pendingSaveRef.current = nextState;
    scheduleCloudSave();
  }

  function scheduleCloudSave(delay = 350) {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void flushCloudSave();
    }, delay);
  }

  async function flushCloudSave() {
    if (saveInFlightRef.current || !pendingSaveRef.current) return;
    if (!navigator.onLine) {
      setSyncStatus("offline");
      return;
    }

    const nextState = pendingSaveRef.current;
    pendingSaveRef.current = null;
    saveInFlightRef.current = true;
    setSyncStatus("saving");

    try {
      const saved = await awakenRepository.save(nextState, revisionRef.current);
      revisionRef.current = saved.revision;
      setSyncStatus("saved");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "";
      setSyncStatus(message.includes("another device") ? "conflict" : navigator.onLine ? "error" : "offline");
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) scheduleCloudSave(100);
    }
  }

  function commitFromCurrent(buildNextState: (currentState: AwakenState) => AwakenState) {
    commit(buildNextState(stateRef.current));
  }

  function setArcTheme(arcThemeId: ArcThemeId) {
    const themeExists = ARC_THEMES.some((theme) => theme.id === arcThemeId);

    if (!themeExists) {
      return;
    }

    commitFromCurrent((currentState) => ({
      ...currentState,
      profile: {
        ...currentState.profile,
        arcThemeId
      }
    }));
  }

  function updateProfileIdentity(input: { displayName: string; mainArcId: UserProfile["mainArcId"]; arcThemeId: ArcThemeId }) {
    if (!MAIN_ARCS.some((arc) => arc.id === input.mainArcId) || !ARC_THEMES.some((theme) => theme.id === input.arcThemeId)) return;
    commitFromCurrent((currentState) => ({
      ...currentState,
      profile: { ...currentState.profile, displayName: input.displayName.trim(), mainArcId: input.mainArcId, arcThemeId: input.arcThemeId }
    }));
  }

  useEffect(() => {
    function handleOnline() {
      if (pendingSaveRef.current) scheduleCloudSave(0);
    }

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  // Save scheduling is ref-driven so multiple local changes collapse into one write.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const migrationCompleted = localStorage.getItem(`${AWAKEN_STORAGE_KEY}:migration-complete`);
        const local = migrationCompleted ? null : loadSavedState();
        const cloud = await awakenRepository.load();
        if (cancelled) return;
        if (cloud) {
          revisionRef.current = cloud.revision;
          stateRef.current = cloud.state; setState(cloud.state);
          if (local) { setLegacyCandidate(local); setMigrationConflict(true); }
          setSyncStatus("saved");
          return;
        }
        if (local) { setLegacyCandidate(local); setMigrationConflict(false); setSyncStatus("saved"); return; }
        setRequiresOnboarding(true);
        setSyncStatus("saved");
      } catch { if (!cancelled) setSyncStatus(navigator.onLine ? "error" : "offline"); }
    }
    void initialize();

    return () => {
      cancelled = true;
    };
  }, []); // Authentication middleware fixes the account for this provider lifetime.

  useEffect(() => {
    function rollCalendarForward() {
      const nextDate = getTodayQuestDate();
      const currentState = stateRef.current;
      const nextWeek = getCurrentWeekRange();

      if (!shouldRollCalendarForward(currentState, nextDate, nextWeek.weekStartDate)) {
        return;
      }

      let nextState = rollDailyQuestsToDate(currentState, nextDate);

      if (!isBossForCurrentWeek(nextState.activeBoss, nextWeek.weekStartDate)) {
        nextState = refreshWeeklyReport({
          ...nextState,
          activeBoss: createWeeklyBoss(
            nextState.profile,
            nextState.activityLog,
            nextState
          )
        });
      }

      if (nextState !== currentState) {
        commit(nextState);
      }
    }

    let rolloverTimerId: number | null = null;
    function scheduleNextRollover() {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 2, 0);
      rolloverTimerId = window.setTimeout(() => {
        rollCalendarForward();
        scheduleNextRollover();
      }, Math.max(1_000, nextMidnight.getTime() - now.getTime()));
    }

    scheduleNextRollover();
    window.addEventListener("focus", rollCalendarForward);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") rollCalendarForward();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (rolloverTimerId !== null) window.clearTimeout(rolloverTimerId);
      window.removeEventListener("focus", rollCalendarForward);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  // Calendar rollover is intentionally driven from refs so it never uses stale state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function importLegacyProgress() {
    if (!legacyCandidate) return;
    setSyncStatus("saving");
    setSyncError(null);
    try {
      const saved = await awakenRepository.restore(legacyCandidate, "replace");
      revisionRef.current = saved.revision; stateRef.current = legacyCandidate; setState(legacyCandidate);
      localStorage.setItem(`${AWAKEN_STORAGE_KEY}:migration-backup`, JSON.stringify(legacyCandidate));
      localStorage.setItem(`${AWAKEN_STORAGE_KEY}:migration-complete`, new Date().toISOString());
      setLegacyCandidate(null); setMigrationConflict(false); setSyncStatus("saved");
    } catch (error) {
      setSyncStatus("error");
      setSyncError(error instanceof Error ? error.message : "Import failed. Your browser progress is still safe; please try again.");
    }
  }

  function keepCloudProgress() {
    if (legacyCandidate) localStorage.setItem(`${AWAKEN_STORAGE_KEY}:migration-backup`, JSON.stringify(legacyCandidate));
    localStorage.setItem(`${AWAKEN_STORAGE_KEY}:migration-complete`, new Date().toISOString());
    setLegacyCandidate(null); setMigrationConflict(false);
  }

  function recordPositiveTask(task: PositiveTask) {
    commitFromCurrent((currentState) => buildRecordPositiveTask(currentState, task));
  }

  function recordNegativeAction(action: NegativeAction) {
    commitFromCurrent((currentState) => buildRecordNegativeAction(currentState, action));
  }

  function recordManualTask(input: ManualTaskInput) {
    const title = input.title.trim();

    if (!title) {
      return;
    }

    if (input.actionType === "positive") {
      const task: PositiveTask = {
        id: createManualTaskId("positive"),
        title,
        stat: input.stat,
        baseXp: getManualTaskXp(title, input.actionType, input.xpAmount),
        tags: ["manual"]
      };

      commitFromCurrent((currentState) =>
        buildRecordPositiveTask(
          {
            ...currentState,
            customPositiveTasks: [task, ...currentState.customPositiveTasks]
          },
          task
        )
      );
      return;
    }

    const action: NegativeAction = {
      id: createManualTaskId("negative"),
      title,
      stat: input.stat,
      xpPenalty: getManualTaskXp(title, input.actionType, input.xpAmount),
      commonReasons: ["unknown"],
      tags: ["manual"]
    };
    commitFromCurrent((currentState) =>
      buildRecordNegativeAction(
        {
          ...currentState,
          customNegativeActions: [action, ...currentState.customNegativeActions]
        },
        action
      )
    );
  }

  function completeQuest(questId: string) {
    commitFromCurrent((currentState) =>
      applyQuestCompletionToState(currentState, questId)
    );
  }

  function uncompleteQuest(questId: string) {
    commitFromCurrent((currentState) =>
      applyQuestUncompletionToState(currentState, questId)
    );
  }

  function processUrlAction(
    action: string,
    params: { get(name: string): string | null }
  ) {
    if (action === "positive") {
      const actionId = params.get("actionId");
      const task = getAllPositiveTasks(stateRef.current).find(
        (item) => item.id === actionId
      );

      if (task) {
        recordPositiveTask(task);
      }
      return;
    }

    if (action === "negative") {
      const actionId = params.get("actionId");
      const negativeAction = getAllNegativeActions(stateRef.current).find(
        (item) => item.id === actionId
      );

      if (negativeAction) {
        recordNegativeAction(negativeAction);
      }
      return;
    }

    if (action === "quest") {
      const questId = params.get("questId");

      if (questId) {
        completeQuest(questId);
      }
      return;
    }

    if (action === "uncomplete-quest") {
      const questId = params.get("questId");

      if (questId) {
        uncompleteQuest(questId);
      }
      return;
    }

  }

  useEffect(() => {
    function handleActionSubmit(event: SubmitEvent) {
      const form = event.target;

      if (!(form instanceof HTMLFormElement)) {
        return;
      }

      const formData = new FormData(form);
      const action = String(formData.get("awakenAction") ?? "");

      if (!action) {
        return;
      }

      event.preventDefault();
      const params = {
        get(name: string) {
          const value = formData.get(name);

          return typeof value === "string" ? value : null;
        }
      };

      processUrlAction(action, params);
      window.history.replaceState(null, "", pathname);
    }

    document.addEventListener("submit", handleActionSubmit, true);

    return () => {
      document.removeEventListener("submit", handleActionSubmit, true);
    };
  });

  function saveDailyReview(draft: DailyReviewDraft) {
    const review: DailyReview = {
      id: `daily-review-${today}`,
      date: today,
      biggestWin: draft.biggestWin,
      biggestMistake: draft.biggestMistake,
      energyLevel: draft.energyLevel,
      moodLevel: draft.moodLevel,
      hadNegativeAction: draft.hadNegativeAction,
      negativeActionReason: draft.hadNegativeAction
        ? draft.negativeActionReason || "other"
        : undefined,
      tomorrowFocus: draft.tomorrowFocus,
      updatedAt: new Date().toISOString()
    };
    const insight = generateDailyInsight({
      review,
      activityLog: state.activityLog,
      dailyQuests: state.dailyQuests
    });

    commit(
      refreshWeeklyReport({
        ...state,
        dailyReviews: upsertByDate(state.dailyReviews, review),
        dailyInsights: upsertByDate(state.dailyInsights, insight)
      })
    );
  }

  function saveWeeklyReport(draft: WeeklyReflectionDraft) {
    const reflection = createWeeklyReflection(
      draft,
      currentWeek.weekStartDate,
      currentWeek.weekEndDate
    );
    const report = createWeeklyReport({
      ...state,
      weeklyReflections: upsertByWeek(state.weeklyReflections, reflection)
    }, reflection);

    commit({
      ...state,
      weeklyReflections: upsertByWeek(state.weeklyReflections, reflection),
      weeklyReports: upsertByWeek(state.weeklyReports, report)
    });
  }

  function resetProgress() {
    const starterState = createStarterState(stateRef.current.profile.arcThemeId);

    clearStoredState();
    commit(starterState);
  }

  return {
    ...state,
    ...derived,
    recordPositiveTask,
    recordNegativeAction,
    recordManualTask,
    setArcTheme,
    updateProfileIdentity,
    completeQuest,
    uncompleteQuest,
    saveDailyReview,
    saveWeeklyReport,
    resetProgress
    ,syncStatus,
    syncError,
    isCloudLoading: syncStatus === "loading",
    legacyCandidate,
    migrationConflict,
    requiresOnboarding,
    importLegacyProgress,
    keepCloudProgress
    ,getBackupState: () => stateRef.current
  };

  function buildRecordPositiveTask(baseState: AwakenState, task: PositiveTask) {
    const { result, completedQuests, activityName } = applyLinkedTaskReward(
      baseState.profile,
      baseState.dailyQuests,
      task
    );
    const questBonus = applyQuestCompletionBonuses(
      result.updatedProfile,
      completedQuests,
      baseState.awardedQuestBonusMilestones
    );
    const bossCombat = applyBossTaskDamage(questBonus.profile, baseState.activeBoss, task);
    const activityLog = [
      ...bossCombat.events,
      ...questBonus.bonusEvents,
      ...createNextActivityLog(activityName, result, baseState.activityLog)
    ].slice(0, 30);

    return refreshWeeklyReport({
      ...baseState,
      profile: bossCombat.profile,
      activityLog,
      dailyQuests: completedQuests,
      awardedQuestBonusMilestones: questBonus.awardedMilestones,
      activeBoss: bossCombat.boss,
      bossHistory: bossCombat.historyBoss
        ? [bossCombat.historyBoss, ...baseState.bossHistory]
        : baseState.bossHistory
    });
  }

  function buildRecordNegativeAction(baseState: AwakenState, action: NegativeAction) {
    const result = logNegativeAction({ profile: baseState.profile, action });
    const bossCombat = healBossForNegativeAction(baseState.activeBoss, action.id);
    const bossEvents =
      bossCombat.healingDone > 0
        ? [
            createBossEvent(
              baseState.activeBoss.name,
              `Healed ${bossCombat.healingDone} HP`,
              "healing",
              bossCombat.healingDone
            )
          ]
        : [];
    const activityLog = [
      ...bossEvents,
      ...createNextActivityLog(action.title, result, baseState.activityLog)
    ].slice(0, 30);

    return refreshWeeklyReport({
      ...baseState,
      profile: result.updatedProfile,
      activityLog,
      activeBoss: bossCombat.boss
    });
  }
}

export function createReviewDraft(review?: DailyReview): DailyReviewDraft {
  return {
    biggestWin: review?.biggestWin ?? "",
    biggestMistake: review?.biggestMistake ?? "",
    energyLevel: review?.energyLevel ?? 5,
    moodLevel: review?.moodLevel ?? 5,
    hadNegativeAction: review?.hadNegativeAction ?? false,
    negativeActionReason: review?.negativeActionReason ?? "",
    tomorrowFocus: review?.tomorrowFocus ?? ""
  };
}

export function createWeeklyReflectionDraft(
  reflection?: WeeklyReflection
): WeeklyReflectionDraft {
  return {
    biggestWin: reflection?.biggestWin ?? "",
    biggestSetback: reflection?.biggestSetback ?? "",
    lessonLearned: reflection?.lessonLearned ?? "",
    nextWeekFocus: reflection?.nextWeekFocus ?? ""
  };
}

function saveState(state: AwakenState) {
  localStorage.setItem(AWAKEN_STORAGE_KEY, JSON.stringify(state));
}

function clearStoredState() {
  [AWAKEN_STORAGE_KEY, ...LEGACY_STORAGE_KEYS].forEach((storageKey) => {
    localStorage.removeItem(storageKey);
  });
}

function loadSavedState(): AwakenState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawState = localStorage.getItem(AWAKEN_STORAGE_KEY);
  if (!rawState) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<AwakenState>;
    if (!parsed.profile || !Array.isArray(parsed.activityLog)) {
      return null;
    }

    const today = getTodayQuestDate();
    const currentWeek = getCurrentWeekRange();
    const savedArcThemeId = parsed.profile.arcThemeId;
    const arcThemeId = ARC_THEMES.some((theme) => theme.id === savedArcThemeId)
      ? savedArcThemeId
      : "minimal";
    const profile = {
      ...parsed.profile,
      arcThemeId,
      disciplineXp: parsed.profile.disciplineXp ?? 0
    };
    const activityLog = parsed.activityLog;
    const customPositiveTasks = Array.isArray(parsed.customPositiveTasks)
      ? parsed.customPositiveTasks
      : [];
    const customNegativeActions = Array.isArray(parsed.customNegativeActions)
      ? parsed.customNegativeActions
      : [];
    const dailyReviews = Array.isArray(parsed.dailyReviews) ? parsed.dailyReviews : [];
    const dailyInsights = Array.isArray(parsed.dailyInsights) ? parsed.dailyInsights : [];
    const weeklyReflections = Array.isArray(parsed.weeklyReflections)
      ? parsed.weeklyReflections
      : [];
    const activeBoss =
      parsed.activeBoss &&
      isBossForCurrentWeek(parsed.activeBoss, currentWeek.weekStartDate)
        ? parsed.activeBoss
        : createWeeklyBoss(profile, activityLog, {
            customPositiveTasks,
            customNegativeActions
          });
    const dailyQuests =
      parsed.questDate === today && Array.isArray(parsed.dailyQuests)
        ? parsed.dailyQuests
        : createDailyQuests(profile, activityLog, today, {
            customPositiveTasks,
            customNegativeActions
          });
    const baseState: AwakenState = {
      profile,
      activityLog,
      customPositiveTasks,
      customNegativeActions,
      dailyQuests,
      questDate: today,
      awardedQuestBonusMilestones:
        parsed.questDate === today && Array.isArray(parsed.awardedQuestBonusMilestones)
          ? parsed.awardedQuestBonusMilestones
          : [],
      activeBoss,
      bossHistory: Array.isArray(parsed.bossHistory) ? parsed.bossHistory : [],
      dailyReviews,
      dailyInsights,
      weeklyReports: Array.isArray(parsed.weeklyReports) ? parsed.weeklyReports : [],
      weeklyReflections
    };

    return ensureCurrentWeeklyReport(baseState);
  } catch {
    return null;
  }
}

export function createStarterState(
  arcThemeId: ArcThemeId = starterUserProfile.arcThemeId
): AwakenState {
  const today = getTodayQuestDate();
  const starterProfile = {
    ...starterUserProfile,
    arcThemeId
  };
  const dailyQuests = createDailyQuests(starterProfile, [], today);
  const activeBoss = createWeeklyBoss(starterProfile, []);
  const state: AwakenState = {
    profile: starterProfile,
    activityLog: [],
    customPositiveTasks: [],
    customNegativeActions: [],
    dailyQuests,
    questDate: today,
    awardedQuestBonusMilestones: [],
    activeBoss,
    bossHistory: [],
    dailyReviews: [],
    dailyInsights: [],
    weeklyReports: [],
    weeklyReflections: []
  };

  return ensureCurrentWeeklyReport(state);
}

export function createPersonalizedStarterState(input: {
  displayName: string; mainArcId: UserProfile["mainArcId"]; arcThemeId: ArcThemeId;
  positiveTasks: PositiveTask[]; negativeActions: NegativeAction[];
}): AwakenState {
  const base = createStarterState(input.arcThemeId);
  const profile = { ...base.profile, displayName: input.displayName, mainArcId: input.mainArcId, createdAt: new Date().toISOString() };
  const taskState = { customPositiveTasks: input.positiveTasks, customNegativeActions: input.negativeActions };
  return ensureCurrentWeeklyReport({
    ...base, profile,
    customPositiveTasks: input.positiveTasks,
    customNegativeActions: input.negativeActions,
    dailyQuests: createDailyQuests(profile, [], getTodayQuestDate(), taskState),
    activeBoss: createWeeklyBoss(profile, [])
  });
}

function createDailyQuests(
  profile: UserProfile,
  activityLog: ActivityEvent[],
  today: string,
  taskState?: Pick<
    AwakenState,
    "customPositiveTasks" | "customNegativeActions"
  >
) {
  const dayNumber = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86_400_000);
  const profileSeed = [...profile.id].reduce(
    (seed, character) => seed + character.charCodeAt(0),
    0
  );
  const positiveTasks = rotateItems(
    [...PRESET_POSITIVE_TASKS, ...(taskState?.customPositiveTasks ?? [])],
    dayNumber + profileSeed
  );

  return generateDailyQuests({
    profile,
    positiveTasks,
    negativeActions: [
      ...PRESET_NEGATIVE_ACTIONS,
      ...(taskState?.customNegativeActions ?? [])
    ],
    mainArcs: MAIN_ARCS,
    recentNegativeActionIds: getRecentNegativeActionIds(activityLog),
    today
  });
}

export function rollDailyQuestsToDate(state: AwakenState, today: string) {
  if (state.questDate === today) {
    return state;
  }

  return {
    ...state,
    dailyQuests: createDailyQuests(state.profile, state.activityLog, today, state),
    questDate: today,
    awardedQuestBonusMilestones: []
  };
}

export function shouldRollCalendarForward(
  state: Pick<AwakenState, "questDate" | "activeBoss">,
  today: string,
  weekStartDate: string
) {
  return state.questDate !== today || !isBossForCurrentWeek(state.activeBoss, weekStartDate);
}

function createWeeklyBoss(
  profile: UserProfile,
  activityLog: ActivityEvent[],
  taskState?: Pick<AwakenState, "customPositiveTasks" | "customNegativeActions">
) {
  const week = getCurrentWeekRange();

  return generateWeeklyBoss({
    profile,
    positiveTasks: [
      ...PRESET_POSITIVE_TASKS,
      ...(taskState?.customPositiveTasks ?? [])
    ],
    negativeActions: [
      ...PRESET_NEGATIVE_ACTIONS,
      ...(taskState?.customNegativeActions ?? [])
    ],
    mainArcs: MAIN_ARCS,
    recentNegativeActionIds: getRecentNegativeActionIds(activityLog),
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate
  });
}

export function applyUrlActionToState(
  state: AwakenState,
  action: string,
  params: { get(name: string): string | null }
) {
  if (action === "positive") {
    const actionId = params.get("actionId");
    const task = getAllPositiveTasks(state).find((item) => item.id === actionId);

    return task ? applyPositiveTaskToState(state, task) : state;
  }

  if (action === "negative") {
    const actionId = params.get("actionId");
    const negativeAction = getAllNegativeActions(state).find(
      (item) => item.id === actionId
    );

    return negativeAction ? applyNegativeActionToState(state, negativeAction) : state;
  }

  if (action === "quest") {
    const questId = params.get("questId");

    return questId ? applyQuestCompletionToState(state, questId) : state;
  }

  if (action === "uncomplete-quest") {
    const questId = params.get("questId");

    return questId ? applyQuestUncompletionToState(state, questId) : state;
  }

  return state;
}

function applyPositiveTaskToState(baseState: AwakenState, task: PositiveTask) {
  const { result, completedQuests, activityName } = applyLinkedTaskReward(
    baseState.profile,
    baseState.dailyQuests,
    task
  );
  const questBonus = applyQuestCompletionBonuses(
    result.updatedProfile,
    completedQuests,
    baseState.awardedQuestBonusMilestones
  );
  const bossCombat = applyBossTaskDamage(questBonus.profile, baseState.activeBoss, task);
  const activityLog = [
    ...bossCombat.events,
    ...questBonus.bonusEvents,
    ...createNextActivityLog(activityName, result, baseState.activityLog)
  ].slice(0, 30);

  return refreshWeeklyReport({
    ...baseState,
    profile: bossCombat.profile,
    activityLog,
    dailyQuests: completedQuests,
    awardedQuestBonusMilestones: questBonus.awardedMilestones,
    activeBoss: bossCombat.boss,
    bossHistory: bossCombat.historyBoss
      ? [bossCombat.historyBoss, ...baseState.bossHistory]
      : baseState.bossHistory
  });
}

function applyLinkedTaskReward(
  profile: UserProfile,
  dailyQuests: DailyQuest[],
  task: PositiveTask
) {
  const linkedQuest = dailyQuests.find(
    (quest) => !quest.completed && quest.linkedTaskId === task.id
  );
  const result = logPositiveTask({
    profile,
    task,
    xpOverride: linkedQuest?.xpReward,
    sourceId: linkedQuest?.id,
    note: linkedQuest ? `${linkedQuest.title} completed through linked task` : undefined
  });

  return {
    result,
    completedQuests: linkedQuest
      ? completeQuestsForTask(dailyQuests, task.id)
      : dailyQuests,
    activityName: linkedQuest ? `${task.title} · ${linkedQuest.title}` : task.title
  };
}

function applyNegativeActionToState(baseState: AwakenState, action: NegativeAction) {
  const result = logNegativeAction({ profile: baseState.profile, action });
  const bossCombat = healBossForNegativeAction(baseState.activeBoss, action.id);
  const bossEvents =
    bossCombat.healingDone > 0
      ? [
          createBossEvent(
            baseState.activeBoss.name,
            `Healed ${bossCombat.healingDone} HP`,
            "healing",
            bossCombat.healingDone
          )
        ]
      : [];
  const activityLog = [
    ...bossEvents,
    ...createNextActivityLog(action.title, result, baseState.activityLog)
  ].slice(0, 30);

  return refreshWeeklyReport({
    ...baseState,
    profile: result.updatedProfile,
    activityLog,
    activeBoss: bossCombat.boss
  });
}

function applyQuestCompletionToState(state: AwakenState, questId: string) {
  const quest = state.dailyQuests.find((item) => item.id === questId);

  if (!quest || quest.completed) {
    return state;
  }

  const completedAt = new Date().toISOString();
  const result = applyManualXp({
    profile: state.profile,
    stat: quest.targetStat,
    xpAmount: quest.xpReward,
    sourceId: quest.id,
    loggedAt: completedAt,
    note: `${quest.title} completed`
  });
  const completedQuests = state.dailyQuests.map((item) =>
    item.id === quest.id ? { ...item, completed: true, completedAt } : item
  );
  const questBonus = applyQuestCompletionBonuses(
    result.updatedProfile,
    completedQuests,
    state.awardedQuestBonusMilestones
  );
  const linkedTask = getAllPositiveTasks(state).find(
    (task) => task.id === quest.linkedTaskId
  );
  const bossCombat = linkedTask
    ? applyBossTaskDamage(questBonus.profile, state.activeBoss, linkedTask)
    : {
        profile: questBonus.profile,
        boss: state.activeBoss,
        events: [],
        historyBoss: null
      };
  const activityLog = [
    ...bossCombat.events,
    ...questBonus.bonusEvents,
    ...createNextActivityLog(quest.title, result, state.activityLog)
  ].slice(0, 30);

  return refreshWeeklyReport({
    ...state,
    profile: bossCombat.profile,
    activityLog,
    dailyQuests: completedQuests,
    awardedQuestBonusMilestones: questBonus.awardedMilestones,
    activeBoss: bossCombat.boss,
    bossHistory: bossCombat.historyBoss
      ? [bossCombat.historyBoss, ...state.bossHistory]
      : state.bossHistory
  });
}

function applyQuestUncompletionToState(state: AwakenState, questId: string) {
  const quest = state.dailyQuests.find((item) => item.id === questId);

  if (!quest?.completed) {
    return state;
  }

  const questRewardEvent = state.activityLog.find(
    (event): event is Extract<ActivityEvent, { kind: "xp" }> =>
      event.kind === "xp" &&
      event.result.logEntry.sourceId === quest.id &&
      event.result.xpChanged > 0
  );
  const xpToRemove = Math.min(
    quest.xpReward,
    questRewardEvent?.result.xpChanged ?? 0
  );
  const completedQuests = state.dailyQuests.map((item) =>
    item.id === quest.id
      ? { ...item, completed: false, completedAt: undefined }
      : item
  );
  const result =
    xpToRemove > 0
      ? applyManualXp({
          profile: state.profile,
          stat: quest.targetStat,
          xpAmount: -xpToRemove,
          sourceId: `${quest.id}-undo`,
          note: `${quest.title} uncompleted`
        })
      : null;
  const milestoneAdjustment = reverseQuestCompletionBonuses(
    result?.updatedProfile ?? state.profile,
    completedQuests,
    state.awardedQuestBonusMilestones
  );
  const bossAdjustment = reverseQuestBossDamage(
    state.activeBoss,
    quest,
    getAllPositiveTasks(state),
    Boolean(questRewardEvent)
  );
  const activityLog = [
    ...bossAdjustment.events,
    ...milestoneAdjustment.events,
    ...(result
      ? createNextActivityLog(`${quest.title} undo`, result, state.activityLog)
      : state.activityLog)
  ].slice(0, 30);

  return refreshWeeklyReport({
    ...state,
    profile: milestoneAdjustment.profile,
    activityLog,
    dailyQuests: completedQuests,
    awardedQuestBonusMilestones: milestoneAdjustment.awardedMilestones,
    activeBoss: bossAdjustment.boss
  });
}

export function estimateManualTaskXp(
  title: string,
  actionType: "positive" | "negative"
) {
  return analyzeManualTaskXp(title, actionType).xp;
}

export function analyzeManualTaskXp(
  title: string,
  actionType: "positive" | "negative"
): ManualXpEstimate {
  const text = title.toLowerCase().trim();

  if (!text) {
    return {
      xp: actionType === "positive" ? 50 : 35,
      confidence: 35,
      suggestedStat: actionType === "positive" ? "vitality" : "intelligence",
      archetype: "General action",
      nearestPreset: actionType === "positive"
        ? "Follow sleep routine (+50 XP)"
        : "Doomscrolling (-35 XP)",
      signals: ["Waiting for a task title"]
    };
  }

  const archetypes = actionType === "positive" ? positiveXpArchetypes : negativeXpArchetypes;
  const rankedArchetypes = archetypes
    .map((archetype) => ({
      ...archetype,
      matchScore: getArchetypeMatchScore(text, archetype.keywords)
    }))
    .sort((first, second) => second.matchScore - first.matchScore);
  const bestMatch = rankedArchetypes[0];
  const fallback = actionType === "positive"
    ? { label: "General positive action", stat: "vitality" as const, xp: 45, keywords: [] }
    : { label: "General negative action", stat: "intelligence" as const, xp: 30, keywords: [] };
  const archetype = bestMatch?.matchScore > 0 ? bestMatch : fallback;
  const adjustment = getXpAdjustment(text, actionType);
  const rawXp = archetype.xp + adjustment.amount;
  const xp = clampXp(rawXp, actionType);
  const nearestPreset = getNearestPresetLabel(xp, actionType);
  const confidence = Math.min(
    95,
    Math.max(40, 42 + (bestMatch?.matchScore ?? 0) * 11 + adjustment.confidenceBoost)
  );

  return {
    xp,
    confidence,
    suggestedStat: archetype.stat,
    archetype: archetype.label,
    nearestPreset,
    signals: [
      `${archetype.label} baseline: ${archetype.xp} XP`,
      ...adjustment.signals,
      `Closest preset: ${nearestPreset}`
    ].slice(0, 5)
  };
}

function getManualTaskXp(
  title: string,
  actionType: "positive" | "negative",
  xpAmount?: number
) {
  if (typeof xpAmount === "number" && Number.isFinite(xpAmount)) {
    return Math.max(1, Math.round(Math.abs(xpAmount)));
  }

  return estimateManualTaskXp(title, actionType);
}

type XpArchetype = {
  label: string;
  stat: StatCategory;
  xp: number;
  keywords: string[];
};

const positiveXpArchetypes: XpArchetype[] = [
  {
    label: "Exceptional endurance milestone",
    stat: "strength",
    xp: 300,
    keywords: ["marathon", "ultramarathon", "triathlon", "ironman"]
  },
  {
    label: "Major learning milestone",
    stat: "intelligence",
    xp: 280,
    keywords: ["earned my degree", "graduated", "defended my thesis", "finished my dissertation", "passed the bar exam"]
  },
  {
    label: "Major creative milestone",
    stat: "intelligence",
    xp: 260,
    keywords: ["published a book", "released an album", "premiered my film", "launched my app"]
  },
  {
    label: "Major financial milestone",
    stat: "wealth",
    xp: 250,
    keywords: ["paid off my debt", "bought a home", "launched my business", "earned a promotion"]
  },
  {
    label: "Hard physical training",
    stat: "strength",
    xp: 80,
    keywords: ["workout", "gym", "lift", "lifting", "weights", "strength training"]
  },
  {
    label: "Moderate sport or cardio",
    stat: "strength",
    xp: 65,
    keywords: ["pickleball", "basketball", "soccer", "tennis", "run", "cardio", "swim", "bike"]
  },
  {
    label: "Focused study",
    stat: "intelligence",
    xp: 60,
    keywords: ["study", "homework", "course", "lesson", "learn", "read", "chapter", "deep work"]
  },
  {
    label: "Creative practice",
    stat: "intelligence",
    xp: 55,
    keywords: ["creative", "draw", "write", "music", "practice", "coding", "build", "project"]
  },
  {
    label: "Recovery or mindfulness",
    stat: "vitality",
    xp: 50,
    keywords: ["sleep", "meditat", "stretch", "walk", "journal", "therapy", "hydrate", "meal prep"]
  },
  {
    label: "Money or career maintenance",
    stat: "wealth",
    xp: 45,
    keywords: ["budget", "money", "finance", "spending", "job", "career", "apply", "invoice"]
  },
  {
    label: "Social connection",
    stat: "charisma",
    xp: 40,
    keywords: ["call", "text", "reach out", "conversation", "friend", "family", "network", "social"]
  }
];

const negativeXpArchetypes: XpArchetype[] = [
  {
    label: "Missed physical commitment",
    stat: "strength",
    xp: 45,
    keywords: ["skipped workout", "missed workout", "skipped gym", "missed gym", "skipped run"]
  },
  {
    label: "Focus drain",
    stat: "intelligence",
    xp: 35,
    keywords: ["doomscroll", "scroll", "distracted", "procrastinat", "wasted time", "youtube"]
  },
  {
    label: "Recovery damage",
    stat: "vitality",
    xp: 50,
    keywords: ["stayed up", "late", "overslept", "poor sleep", "junk", "missed medication"]
  },
  {
    label: "Impulse spending",
    stat: "wealth",
    xp: 40,
    keywords: ["impulse", "spent", "shopping", "overspent", "budget", "takeout"]
  },
  {
    label: "Avoided communication",
    stat: "charisma",
    xp: 35,
    keywords: ["avoided", "conversation", "ignored", "argument", "snapped", "ghosted"]
  }
];

function getArchetypeMatchScore(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    if (!text.includes(keyword)) {
      return score;
    }

    return score + (keyword.includes(" ") ? 2 : 1);
  }, 0);
}

function getXpAdjustment(text: string, actionType: "positive" | "negative") {
  const signals: string[] = [];
  let amount = 0;
  let confidenceBoost = 0;
  const durationMinutes = getDurationMinutes(text);

  if (durationMinutes) {
    confidenceBoost += 10;

    if (durationMinutes < 10) {
      amount -= actionType === "positive" ? 12 : 8;
      signals.push("Short duration lowered XP");
    } else if (durationMinutes >= 360) {
      amount += actionType === "positive" ? 140 : 45;
      signals.push(`${durationMinutes} minutes qualified as an all-day effort`);
    } else if (durationMinutes >= 240) {
      amount += actionType === "positive" ? 100 : 35;
      signals.push(`${durationMinutes} minutes qualified as a major effort`);
    } else if (durationMinutes >= 120) {
      amount += actionType === "positive" ? 55 : 25;
      signals.push(`${durationMinutes} minutes qualified as sustained effort`);
    } else if (durationMinutes >= 60) {
      amount += durationMinutes >= 90 ? 30 : 15;
      signals.push(`${durationMinutes} minutes increased XP`);
    } else {
      signals.push(`${durationMinutes} minutes matched preset scale`);
    }
  }

  amount += getSignalAdjustment(text, [
    [["over several months", "for months", "all year", "life-changing milestone"], 100, "Long-term scope raised XP"],
    [["hard", "intense", "major", "finished", "completed", "important", "meaningful"], 14, "High effort raised XP"],
    [["long", "deep", "focused", "serious"], 10, "Focused effort raised XP"],
    [["quick", "small", "tiny", "easy", "brief", "minor"], -12, "Small effort lowered XP"]
  ], signals);

  if (actionType === "negative") {
    amount += getSignalAdjustment(text, [
      [["binge", "relapse", "blew off", "ignored", "argument", "all night"], 22, "High severity raised penalty"],
      [["almost", "a little", "short", "minor"], -10, "Lower severity reduced penalty"]
    ], signals);
  }

  return { amount, confidenceBoost, signals };
}

function getSignalAdjustment(
  text: string,
  rules: Array<[string[], number, string]>,
  signals: string[]
) {
  return rules.reduce((total, [keywords, amount, signal]) => {
    if (!keywords.some((keyword) => text.includes(keyword))) {
      return total;
    }

    signals.push(signal);
    return total + amount;
  }, 0);
}

function getDurationMinutes(text: string) {
  const match = text.match(/(\d+)\s*(minute|minutes|min|hour|hours|hr|hrs)\b/);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(value)) {
    return null;
  }

  return unit.startsWith("hour") || unit.startsWith("hr") ? value * 60 : value;
}

function clampXp(xp: number, actionType: "positive" | "negative") {
  const { minimum, maximum } = MANUAL_XP_LIMITS[actionType];

  return Math.min(maximum, Math.max(minimum, Math.round(xp)));
}

function getNearestPresetLabel(xp: number, actionType: "positive" | "negative") {
  const presets = actionType === "positive" ? PRESET_POSITIVE_TASKS : PRESET_NEGATIVE_ACTIONS;
  const nearest = [...presets].sort((first, second) => {
    const firstXp = "baseXp" in first ? first.baseXp : first.xpPenalty;
    const secondXp = "baseXp" in second ? second.baseXp : second.xpPenalty;

    return Math.abs(firstXp - xp) - Math.abs(secondXp - xp);
  })[0];

  if (!nearest) {
    return `${xp} XP baseline`;
  }

  const nearestXp = "baseXp" in nearest ? nearest.baseXp : nearest.xpPenalty;
  const sign = actionType === "positive" ? "+" : "-";

  return `${nearest.title} (${sign}${nearestXp} XP, ${STAT_CATEGORY_LABELS[nearest.stat]})`;
}

function createManualTaskId(actionType: "positive" | "negative") {
  return `manual-${actionType}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function rotateItems<TItem>(items: TItem[], count: number) {
  if (items.length === 0) {
    return items;
  }

  const offset = count % items.length;

  return [...items.slice(offset), ...items.slice(0, offset)];
}

function getAllPositiveTasks(state: Pick<AwakenState, "customPositiveTasks">) {
  return [...PRESET_POSITIVE_TASKS, ...state.customPositiveTasks];
}

function getAllNegativeActions(state: Pick<AwakenState, "customNegativeActions">) {
  return [...PRESET_NEGATIVE_ACTIONS, ...state.customNegativeActions];
}

function getXpTotal(activityLog: ActivityEvent[], direction: "positive" | "negative") {
  return activityLog.reduce((total, event) => {
    if (event.kind !== "xp") {
      return total;
    }

    if (direction === "positive") {
      return total + Math.max(0, event.result.xpChanged);
    }

    return total + Math.abs(Math.min(0, event.result.xpChanged));
  }, 0);
}

function ensureCurrentWeeklyReport(state: AwakenState) {
  const week = getCurrentWeekRange();
  const currentReport = state.weeklyReports.find(
    (report) => report.weekStartDate === week.weekStartDate
  );

  if (currentReport) {
    return state;
  }

  return {
    ...state,
    weeklyReports: [createWeeklyReport(state), ...state.weeklyReports]
  };
}

function refreshWeeklyReport(state: AwakenState) {
  return {
    ...state,
    weeklyReports: upsertByWeek(state.weeklyReports, createWeeklyReport(state))
  };
}

function createWeeklyReport(state: AwakenState, reflection?: WeeklyReflection) {
  const week = getCurrentWeekRange();
  const currentReflection =
    reflection ??
    state.weeklyReflections.find(
      (item) => item.weekStartDate === week.weekStartDate
    );

  return generateWeeklyReport({
    weekStartDate: week.weekStartDate,
    weekEndDate: week.weekEndDate,
    activityLog: state.activityLog,
    dailyQuests: state.dailyQuests,
    dailyReviews: state.dailyReviews,
    activeBoss: state.activeBoss,
    reflection: currentReflection
  });
}

function getRecentNegativeActionIds(activityLog: ActivityEvent[]) {
  return activityLog
    .filter(
      (event) =>
        event.kind === "xp" &&
        event.result.logEntry.sourceType === "negative_action" &&
        Boolean(event.result.logEntry.sourceId)
    )
    .map((event) =>
      event.kind === "xp" ? event.result.logEntry.sourceId ?? "" : ""
    )
    .filter(Boolean)
    .slice(0, 5);
}

function applyQuestCompletionBonuses(
  profile: UserProfile,
  quests: DailyQuest[],
  awardedMilestones: number[]
) {
  const completedCount = getCompletedQuestCount(quests);
  const nextMilestones = [...awardedMilestones];
  const bonusEvents: ActivityEvent[] = [];
  let disciplineXpToAdd = 0;

  if (completedCount >= 4 && !nextMilestones.includes(4)) {
    disciplineXpToAdd += QUEST_BONUS_FOUR_COMPLETE_XP;
    nextMilestones.push(4);
    bonusEvents.push(createDisciplineBonusEvent(4, QUEST_BONUS_FOUR_COMPLETE_XP));
  }

  if (completedCount >= 5 && !nextMilestones.includes(5)) {
    disciplineXpToAdd += QUEST_BONUS_FIVE_COMPLETE_XP;
    nextMilestones.push(5);
    bonusEvents.push(createDisciplineBonusEvent(5, QUEST_BONUS_FIVE_COMPLETE_XP));
  }

  return {
    profile: { ...profile, disciplineXp: profile.disciplineXp + disciplineXpToAdd },
    awardedMilestones: nextMilestones,
    bonusEvents
  };
}

function reverseQuestCompletionBonuses(
  profile: UserProfile,
  quests: DailyQuest[],
  awardedMilestones: number[]
) {
  const completedCount = getCompletedQuestCount(quests);
  const lostMilestones = awardedMilestones.filter(
    (milestone) => milestone > completedCount
  );
  const disciplineXpToRemove = lostMilestones.reduce((total, milestone) => {
    if (milestone === 4) {
      return total + QUEST_BONUS_FOUR_COMPLETE_XP;
    }

    if (milestone === 5) {
      return total + QUEST_BONUS_FIVE_COMPLETE_XP;
    }

    return total;
  }, 0);
  const events = lostMilestones.map((milestone) =>
    createDisciplineBonusEvent(
      milestone,
      milestone === 4 ? -QUEST_BONUS_FOUR_COMPLETE_XP : -QUEST_BONUS_FIVE_COMPLETE_XP
    )
  );

  return {
    profile: {
      ...profile,
      disciplineXp: Math.max(0, profile.disciplineXp - disciplineXpToRemove)
    },
    awardedMilestones: awardedMilestones.filter(
      (milestone) => !lostMilestones.includes(milestone)
    ),
    events
  };
}

function reverseQuestBossDamage(
  boss: WeeklyBoss,
  quest: DailyQuest,
  positiveTasks: PositiveTask[],
  questRewardWasApplied: boolean
) {
  const linkedTask = positiveTasks.find((task) => task.id === quest.linkedTaskId);

  if (
    !questRewardWasApplied ||
    !linkedTask ||
    boss.status !== "active" ||
    !boss.damageTaskIds.includes(linkedTask.id)
  ) {
    return { boss, events: [] };
  }

  const nextHp = Math.min(boss.maxHp, boss.currentHp + BOSS_DAMAGE_PER_TASK);
  const healingDone = nextHp - boss.currentHp;

  if (healingDone <= 0) {
    return { boss, events: [] };
  }

  return {
    boss: { ...boss, currentHp: nextHp },
    events: [
      createBossEvent(
        boss.name,
        `Recovered ${healingDone} HP from quest undo`,
        "healing",
        healingDone
      )
    ]
  };
}

function applyBossTaskDamage(
  profile: UserProfile,
  boss: WeeklyBoss,
  task: PositiveTask
) {
  const combat = damageBossForTask(boss, task.id);
  const events: ActivityEvent[] = [];
  let nextProfile = profile;
  let nextBoss = combat.boss;
  let historyBoss: WeeklyBoss | null = null;

  if (combat.damageDone > 0) {
    events.push(
      createBossEvent(nextBoss.name, `Took ${combat.damageDone} damage`, "damage", combat.damageDone)
    );
  }

  if (combat.defeated && !nextBoss.rewardsClaimed) {
    const reward = claimBossRewards(nextProfile, nextBoss);

    nextProfile = reward.profile;
    nextBoss = reward.boss;
    historyBoss = reward.historyBoss;
    events.unshift(...reward.events);
  }

  return { profile: nextProfile, boss: nextBoss, events, historyBoss };
}

function claimBossRewards(profile: UserProfile, boss: WeeklyBoss) {
  if (boss.rewardsClaimed) {
    return { profile, boss, events: [], historyBoss: null };
  }

  const rewardResult = applyManualXp({
    profile,
    stat: boss.targetStat,
    xpAmount: boss.rewards.statXp,
    sourceId: boss.id,
    note: `${boss.name} defeated`
  });
  const rewardedProfile = {
    ...rewardResult.updatedProfile,
    disciplineXp: rewardResult.updatedProfile.disciplineXp + boss.rewards.disciplineXp
  };
  const rewardedBoss = { ...boss, status: "defeated" as const, currentHp: 0, rewardsClaimed: true };

  return {
    profile: rewardedProfile,
    boss: rewardedBoss,
    events: [
      createBossRewardEvent(rewardedBoss),
      createXpEvent(`${rewardedBoss.name} reward`, rewardResult)
    ],
    historyBoss: rewardedBoss
  };
}

function createNextActivityLog(
  name: string,
  result: XPChangeResult,
  currentLog: ActivityEvent[]
) {
  return [createXpEvent(name, result), ...currentLog];
}

function createXpEvent(name: string, result: XPChangeResult): ActivityEvent {
  return { id: result.logEntry.id, name, kind: "xp", result };
}

function createBossEvent(
  name: string,
  message: string,
  combatType: "damage" | "healing",
  hpAmount: number
): ActivityEvent {
  return {
    id: `boss-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    kind: "boss",
    message,
    combatType,
    hpAmount,
    createdAt: new Date().toISOString()
  };
}

function createBossRewardEvent(boss: WeeklyBoss): ActivityEvent {
  return {
    id: `boss-reward-${boss.id}-${Date.now()}`,
    name: `${boss.name} defeated`,
    kind: "boss_reward",
    statXp: boss.rewards.statXp,
    disciplineXp: boss.rewards.disciplineXp,
    targetStat: boss.targetStat,
    titleUnlock: boss.rewards.titleUnlock,
    createdAt: new Date().toISOString()
  };
}

function createDisciplineBonusEvent(
  completedQuestCount: number,
  xpAmount: number
): ActivityEvent {
  return {
    id: `discipline-bonus-${completedQuestCount}-${Date.now()}`,
    name: `${completedQuestCount} quest clear bonus`,
    kind: "discipline_bonus",
    xpAmount,
    completedQuestCount,
    createdAt: new Date().toISOString()
  };
}

function createWeeklyReflection(
  draft: WeeklyReflectionDraft,
  weekStartDate: string,
  weekEndDate: string
): WeeklyReflection {
  return {
    id: `weekly-reflection-${weekStartDate}`,
    weekStartDate,
    weekEndDate,
    biggestWin: draft.biggestWin,
    biggestSetback: draft.biggestSetback,
    lessonLearned: draft.lessonLearned,
    nextWeekFocus: draft.nextWeekFocus,
    updatedAt: new Date().toISOString()
  };
}

function upsertByDate<TItem extends { date: string }>(items: TItem[], item: TItem) {
  return [item, ...items.filter((existing) => existing.date !== item.date)];
}

function upsertByWeek<TItem extends { weekStartDate: string }>(
  items: TItem[],
  item: TItem
) {
  return [
    item,
    ...items.filter((existing) => existing.weekStartDate !== item.weekStartDate)
  ];
}
