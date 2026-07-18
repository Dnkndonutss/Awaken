import type {
  DailyQuest,
  DailyQuestType,
  MainArc,
  NegativeAction,
  PositiveTask,
  StatCategory,
  UserProfile
} from "@/types/awaken";

type GenerateDailyQuestsInput = {
  profile: UserProfile;
  positiveTasks: PositiveTask[];
  negativeActions: NegativeAction[];
  mainArcs: MainArc[];
  recentNegativeActionIds: string[];
  today: string;
};

type QuestTemplateInput = {
  today: string;
  questType: DailyQuestType;
  title: string;
  description: string;
  task: PositiveTask;
  xpReward: number;
};

export const QUEST_BONUS_FOUR_COMPLETE_XP = 50;
export const QUEST_BONUS_FIVE_COMPLETE_XP = 100;

export function generateDailyQuests({
  profile,
  positiveTasks,
  negativeActions,
  mainArcs,
  recentNegativeActionIds,
  today
}: GenerateDailyQuestsInput): DailyQuest[] {
  const weakStats = getWeakStats(profile);
  const mainArc = mainArcs.find((arc) => arc.id === profile.mainArcId);
  const recentNegativeStats = getRecentNegativeStats(
    recentNegativeActionIds,
    negativeActions
  );

  const usedTaskIds = new Set<string>();
  const quests: DailyQuest[] = [];

  const mainTask = pickTaskForStats(positiveTasks, [weakStats[0]], usedTaskIds);
  if (mainTask) {
    quests.push(
      createQuest({
        today,
        questType: "main",
        title: "Main Quest",
        description: `Strengthen your weakest area: ${mainTask.title}.`,
        task: mainTask,
        xpReward: mainTask.baseXp + 25
      })
    );
    usedTaskIds.add(mainTask.id);
  }

  const arcTask = pickTaskForStats(
    positiveTasks,
    mainArc?.primaryStats ?? [],
    usedTaskIds
  );
  if (arcTask) {
    quests.push(
      createQuest({
        today,
        questType: "arc",
        title: "Arc Quest",
        description: `Advance your ${mainArc?.name ?? "main arc"} with ${arcTask.title}.`,
        task: arcTask,
        xpReward: arcTask.baseXp + 20
      })
    );
    usedTaskIds.add(arcTask.id);
  }

  const recoveryTask = pickTaskForStats(
    positiveTasks,
    [...recentNegativeStats, "vitality"],
    usedTaskIds
  );
  if (recoveryTask) {
    quests.push(
      createQuest({
        today,
        questType: "recovery",
        title: "Recovery Quest",
        description: `Recover from recent friction by completing: ${recoveryTask.title}.`,
        task: recoveryTask,
        xpReward: recoveryTask.baseXp + 15
      })
    );
    usedTaskIds.add(recoveryTask.id);
  }

  const bonusTask = pickTaskForStats(positiveTasks, weakStats, usedTaskIds);
  if (bonusTask) {
    quests.push(
      createQuest({
        today,
        questType: "bonus",
        title: "Bonus Quest",
        description: `Take one extra step today by completing: ${bonusTask.title}.`,
        task: bonusTask,
        xpReward: bonusTask.baseXp + 10
      })
    );
    usedTaskIds.add(bonusTask.id);
  }

  const sideTask = positiveTasks.find((task) => !usedTaskIds.has(task.id));
  if (sideTask) {
    quests.push(
      createQuest({
        today,
        questType: "side",
        title: "Side Quest",
        description: `Finish this optional action for a full clear: ${sideTask.title}.`,
        task: sideTask,
        xpReward: sideTask.baseXp
      })
    );
  }

  return quests.slice(0, 5);
}

export function getTodayQuestDate() {
  return new Date().toLocaleDateString("en-CA");
}

export function completeQuestsForTask(
  quests: DailyQuest[],
  linkedTaskId: string,
  completedAt = new Date().toISOString()
) {
  return quests.map((quest) => {
    if (quest.completed || quest.linkedTaskId !== linkedTaskId) {
      return quest;
    }

    return {
      ...quest,
      completed: true,
      completedAt
    };
  });
}

export function getCompletedQuestCount(quests: DailyQuest[]) {
  return quests.filter((quest) => quest.completed).length;
}

function createQuest({
  today,
  questType,
  title,
  description,
  task,
  xpReward
}: QuestTemplateInput): DailyQuest {
  return {
    id: `${today}-${questType}-${task.id}`,
    date: today,
    title,
    description,
    linkedTaskId: task.id,
    targetStat: task.stat,
    xpReward,
    questType,
    sourceTaskIds: [task.id],
    completed: false
  };
}

function getWeakStats(profile: UserProfile) {
  return [...profile.stats]
    .sort((firstStat, secondStat) => {
      if (firstStat.level !== secondStat.level) {
        return firstStat.level - secondStat.level;
      }

      return firstStat.currentXp - secondStat.currentXp;
    })
    .map((statProgress) => statProgress.stat);
}

function getRecentNegativeStats(
  recentNegativeActionIds: string[],
  negativeActions: NegativeAction[]
) {
  const stats = recentNegativeActionIds
    .map((actionId) => negativeActions.find((action) => action.id === actionId))
    .filter((action): action is NegativeAction => Boolean(action))
    .map((action) => action.stat);

  return [...new Set(stats)];
}

function pickTaskForStats(
  tasks: PositiveTask[],
  stats: StatCategory[],
  usedTaskIds: Set<string>
) {
  return (
    stats
      .map((stat) =>
        tasks.find((task) => task.stat === stat && !usedTaskIds.has(task.id))
      )
      .find((task): task is PositiveTask => Boolean(task)) ??
    tasks.find((task) => !usedTaskIds.has(task.id))
  );
}
