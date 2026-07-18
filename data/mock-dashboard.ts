import type { DashboardData } from "@/types/dashboard";

export const dashboardData: DashboardData = {
  playerName: "Seeker",
  level: 12,
  xpCurrent: 1840,
  xpNext: 2400,
  rank: "Silver III",
  streakDays: 9,
  quests: [
    {
      id: "hydrate",
      title: "Drink water before coffee",
      xp: 25,
      completed: true
    },
    {
      id: "focus",
      title: "Complete one deep work sprint",
      xp: 80,
      completed: false
    },
    {
      id: "move",
      title: "Take a 20 minute walk",
      xp: 45,
      completed: false
    }
  ],
  boss: {
    name: "The Procrastinator",
    weakness: "Start with a 5 minute action",
    hpCurrent: 62,
    hpMax: 100
  },
  attributes: [
    { label: "Body", value: 72 },
    { label: "Mind", value: 64 },
    { label: "Spirit", value: 58 },
    { label: "Focus", value: 80 },
    { label: "Social", value: 46 },
    { label: "Craft", value: 69 }
  ]
};
