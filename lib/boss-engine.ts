import type {
  MainArc,
  NegativeAction,
  PositiveTask,
  StatCategory,
  UserProfile,
  WeeklyBoss
} from "@/types/awaken";

type GenerateWeeklyBossInput = {
  profile: UserProfile;
  positiveTasks: PositiveTask[];
  negativeActions: NegativeAction[];
  mainArcs: MainArc[];
  recentNegativeActionIds: string[];
  weekStartDate: string;
  weekEndDate: string;
};

export const BOSS_DAMAGE_PER_TASK = 35;
export const BOSS_HEAL_PER_NEGATIVE_ACTION = 25;

export type WeeklyBossDefinition = {
  id: string;
  name: string;
  description: string;
  titleUnlock: string;
};

export const WEEKLY_BOSS_ROSTER: Record<StatCategory, WeeklyBossDefinition[]> = {
  strength: [
    { id: "iron-warden", name: "Iron Warden", description: "A plated tyrant that yields only to repeated physical action.", titleUnlock: "Iron Breaker" },
    { id: "stonehide-colossus", name: "Stonehide Colossus", description: "A mountain of inertia built from postponed movement and abandoned effort.", titleUnlock: "Colossus Breaker" },
    { id: "ashen-juggernaut", name: "Ashen Juggernaut", description: "A relentless engine that tests whether training survives difficult weeks.", titleUnlock: "Ashen Victor" },
    { id: "chainbreaker-titan", name: "Chainbreaker Titan", description: "A bound giant strengthened by every promise to move that went unfinished.", titleUnlock: "Titan Unbound" },
    { id: "crimson-behemoth", name: "Crimson Behemoth", description: "A brutal wall of force that falls to disciplined, measurable exertion.", titleUnlock: "Behemoth Slayer" }
  ],
  intelligence: [
    { id: "mind-fog-revenant", name: "Mind Fog Revenant", description: "A drifting specter that feeds on distraction and unfinished thought.", titleUnlock: "Fog Piercer" },
    { id: "archive-devourer", name: "Archive Devourer", description: "A knowledge-eater weakened by study, recall, and deliberate practice.", titleUnlock: "Archive Keeper" },
    { id: "doubt-weaver", name: "Doubt Weaver", description: "A patient manipulator that turns uncertainty into paralysis.", titleUnlock: "Doubt Cutter" },
    { id: "static-oracle", name: "Static Oracle", description: "A corrupted signal that obscures priorities beneath noise and prediction.", titleUnlock: "Signal Seer" },
    { id: "labyrinth-sphinx", name: "Labyrinth Sphinx", description: "A keeper of tangled problems defeated through focused reasoning.", titleUnlock: "Labyrinth Solver" }
  ],
  vitality: [
    { id: "sleepless-hollow", name: "Sleepless Hollow", description: "An empty creature born from neglected rest and unstable routines.", titleUnlock: "Hollow Restorer" },
    { id: "fatigue-leviathan", name: "Fatigue Leviathan", description: "A deep-sea weight that grows whenever recovery is postponed.", titleUnlock: "Leviathan Riser" },
    { id: "pale-night-stalker", name: "Pale Night Stalker", description: "A patient hunter that follows inconsistent sleep into the next day.", titleUnlock: "Night Guardian" },
    { id: "hollow-pulse", name: "Hollow Pulse", description: "A failing rhythm restored by food, movement, rest, and steady care.", titleUnlock: "Pulse Keeper" },
    { id: "dread-somnus", name: "Dread Somnus", description: "A dream-bound monarch that makes exhaustion feel permanent.", titleUnlock: "Dreambreaker" }
  ],
  wealth: [
    { id: "debt-phantom", name: "Debt Phantom", description: "A lingering creditor weakened by planning and honest financial review.", titleUnlock: "Debt Banisher" },
    { id: "gilded-maw", name: "Gilded Maw", description: "An endless appetite that turns impulse into disappearing resources.", titleUnlock: "Gilded Tamer" },
    { id: "scarcity-wraith", name: "Scarcity Wraith", description: "A fearful spirit that distorts every decision around money and security.", titleUnlock: "Scarcity Breaker" },
    { id: "coinbound-usurer", name: "Coinbound Usurer", description: "A calculating jailer defeated by budgets, systems, and consistent earning.", titleUnlock: "Coin Liberator" },
    { id: "ruin-merchant", name: "Ruin Merchant", description: "A smiling trader that exchanges long-term stability for immediate comfort.", titleUnlock: "Fortune Keeper" }
  ],
  charisma: [
    { id: "silent-mirror", name: "Silent Mirror", description: "A cold reflection strengthened by avoided conversations and isolation.", titleUnlock: "Mirror Speaker" },
    { id: "isolation-siren", name: "Isolation Siren", description: "A distant song that makes withdrawal feel safer than connection.", titleUnlock: "Siren Resister" },
    { id: "masked-judge", name: "Masked Judge", description: "A faceless critic that turns imagined judgment into silence.", titleUnlock: "Unmasked Voice" },
    { id: "echo-thief", name: "Echo Thief", description: "A shadow that steals confidence before your words can land.", titleUnlock: "Echo Reclaimer" },
    { id: "glass-tongued-serpent", name: "Glass-Tongued Serpent", description: "A polished deceiver defeated by direct and courageous communication.", titleUnlock: "Truth Speaker" }
  ]
};

export function generateWeeklyBoss({
  profile,
  positiveTasks,
  negativeActions,
  mainArcs,
  recentNegativeActionIds,
  weekStartDate,
  weekEndDate
}: GenerateWeeklyBossInput): WeeklyBoss {
  const targetStat = getWeakestStat(profile);
  const mainArc = mainArcs.find((arc) => arc.id === profile.mainArcId);
  const recentNegativeStats = getRecentNegativeStats(
    recentNegativeActionIds,
    negativeActions
  );
  const priorityStats = [
    targetStat,
    ...(mainArc?.primaryStats ?? []),
    ...recentNegativeStats
  ];
  const damageTaskIds = pickTaskIdsForStats(positiveTasks, priorityStats, 3);
  const healingNegativeActionIds = pickNegativeActionIdsForStats(
    negativeActions,
    [targetStat, ...recentNegativeStats],
    2
  );
  const maxHp = 120 + profile.overallLevel * 10;
  const bossDefinition = selectWeeklyBossDefinition(targetStat, profile.id, weekStartDate);

  return {
    id: `${weekStartDate}-${profile.mainArcId}-${targetStat}-${bossDefinition.id}`,
    name: bossDefinition.name,
    description: `${bossDefinition.description} Break it with consistent ${formatStatName(targetStat)} action before the week closes.`,
    maxHp,
    currentHp: maxHp,
    targetStat,
    weekStartDate,
    weekEndDate,
    damageTaskIds,
    healingNegativeActionIds,
    status: "active",
    rewards: {
      statXp: 140,
      disciplineXp: 75,
      titleUnlock: bossDefinition.titleUnlock
    },
    rewardsClaimed: false
  };
}

export function selectWeeklyBossDefinition(
  stat: StatCategory,
  profileId: string,
  weekStartDate: string
) {
  const roster = WEEKLY_BOSS_ROSTER[stat];
  const weekNumber = Math.floor(Date.parse(`${weekStartDate}T00:00:00Z`) / 604_800_000);
  const profileSeed = [...`${profileId}:${stat}`].reduce(
    (seed, character) => seed + character.charCodeAt(0),
    0
  );
  const index = Math.abs(weekNumber + profileSeed) % roster.length;

  return roster[index] ?? roster[0];
}

export function getCurrentWeekRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - daysSinceMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    weekStartDate: toDateKey(start),
    weekEndDate: toDateKey(end)
  };
}

export function isBossForCurrentWeek(boss: WeeklyBoss, weekStartDate: string) {
  return boss.weekStartDate === weekStartDate;
}

export function damageBossForTask(boss: WeeklyBoss, taskId: string) {
  if (boss.status !== "active" || !boss.damageTaskIds.includes(taskId)) {
    return {
      boss,
      damageDone: 0,
      defeated: false
    };
  }

  const currentHp = Math.max(0, boss.currentHp - BOSS_DAMAGE_PER_TASK);
  const defeated = currentHp === 0;

  return {
    boss: {
      ...boss,
      currentHp,
      status: defeated ? ("defeated" as const) : boss.status
    },
    damageDone: BOSS_DAMAGE_PER_TASK,
    defeated
  };
}

export function healBossForNegativeAction(
  boss: WeeklyBoss,
  negativeActionId: string
) {
  if (
    boss.status !== "active" ||
    !boss.healingNegativeActionIds.includes(negativeActionId)
  ) {
    return {
      boss,
      healingDone: 0
    };
  }

  const currentHp = Math.min(
    boss.maxHp,
    boss.currentHp + BOSS_HEAL_PER_NEGATIVE_ACTION
  );

  return {
    boss: {
      ...boss,
      currentHp
    },
    healingDone: currentHp - boss.currentHp
  };
}

function getWeakestStat(profile: UserProfile) {
  return [...profile.stats].sort((firstStat, secondStat) => {
    if (firstStat.level !== secondStat.level) {
      return firstStat.level - secondStat.level;
    }

    return firstStat.currentXp - secondStat.currentXp;
  })[0]?.stat ?? "strength";
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

function pickTaskIdsForStats(
  tasks: PositiveTask[],
  stats: StatCategory[],
  limit: number
) {
  const selectedIds: string[] = [];

  for (const stat of stats) {
    const task = tasks.find(
      (item) => item.stat === stat && !selectedIds.includes(item.id)
    );

    if (task) {
      selectedIds.push(task.id);
    }

    if (selectedIds.length >= limit) {
      return selectedIds;
    }
  }

  for (const task of tasks) {
    if (!selectedIds.includes(task.id)) {
      selectedIds.push(task.id);
    }

    if (selectedIds.length >= limit) {
      return selectedIds;
    }
  }

  return selectedIds;
}

function pickNegativeActionIdsForStats(
  actions: NegativeAction[],
  stats: StatCategory[],
  limit: number
) {
  const selectedIds: string[] = [];

  for (const stat of stats) {
    const action = actions.find(
      (item) => item.stat === stat && !selectedIds.includes(item.id)
    );

    if (action) {
      selectedIds.push(action.id);
    }

    if (selectedIds.length >= limit) {
      return selectedIds;
    }
  }

  for (const action of actions) {
    if (!selectedIds.includes(action.id)) {
      selectedIds.push(action.id);
    }

    if (selectedIds.length >= limit) {
      return selectedIds;
    }
  }

  return selectedIds;
}

function toDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function formatStatName(stat: StatCategory) {
  return `${stat.charAt(0).toUpperCase()}${stat.slice(1)}`;
}
