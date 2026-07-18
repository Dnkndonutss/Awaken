export type Quest = {
  id: string;
  title: string;
  xp: number;
  completed: boolean;
};

export type Boss = {
  name: string;
  weakness: string;
  hpCurrent: number;
  hpMax: number;
};

export type AttributeScore = {
  label: string;
  value: number;
};

export type DashboardData = {
  playerName: string;
  level: number;
  xpCurrent: number;
  xpNext: number;
  rank: string;
  streakDays: number;
  quests: Quest[];
  boss: Boss;
  attributes: AttributeScore[];
};
