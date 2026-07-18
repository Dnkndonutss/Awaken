import type {
  ArcTheme,
  DisciplineTier,
  IdealBuildPreset,
  MainArc,
  NegativeAction,
  NegativeActionReason,
  PositiveTask,
  Rank,
  StatCategory
} from "@/types/awaken";

export const STAT_CATEGORIES: StatCategory[] = [
  "strength",
  "intelligence",
  "vitality",
  "wealth",
  "charisma"
];

export const STAT_CATEGORY_LABELS: Record<StatCategory, string> = {
  strength: "Strength",
  intelligence: "Intelligence",
  vitality: "Vitality",
  wealth: "Wealth",
  charisma: "Charisma"
};

export const MANUAL_XP_LIMITS = {
  positive: { minimum: 15, maximum: 500 },
  negative: { minimum: 10, maximum: 110 }
} as const;

export const DISCIPLINE_TIERS: DisciplineTier[] = [
  {
    id: "untrained",
    name: "Untrained",
    multiplier: 1,
    description: "A normal baseline with no extra XP multiplier."
  },
  {
    id: "steady",
    name: "Steady",
    multiplier: 1.05,
    description: "Small bonus for showing up consistently."
  },
  {
    id: "focused",
    name: "Focused",
    multiplier: 1.15,
    description: "A stronger bonus for reliable daily follow-through."
  },
  {
    id: "elite",
    name: "Elite",
    multiplier: 1.3,
    description: "High multiplier for strong discipline and low drift."
  },
  {
    id: "awakened",
    name: "Awakened",
    multiplier: 1.5,
    description: "The top global multiplier for exceptional consistency."
  }
];

export const RANK_THRESHOLDS: Rank[] = [
  { id: "bronze", name: "Bronze", minLevel: 0 },
  { id: "silver", name: "Silver", minLevel: 3 },
  { id: "gold", name: "Gold", minLevel: 7 },
  { id: "platinum", name: "Platinum", minLevel: 12 },
  { id: "diamond", name: "Diamond", minLevel: 18 },
  { id: "awakened", name: "Awakened", minLevel: 25 }
];

export const ARC_THEMES: ArcTheme[] = [
  {
    id: "minimal",
    name: "Minimal",
    tagline: "Clean focus, current Awaken wording, no extra fantasy layer.",
    className: "theme-minimal",
    fontLabel: "System sans",
    rankNames: {
      bronze: "Bronze",
      silver: "Silver",
      gold: "Gold",
      platinum: "Platinum",
      diamond: "Diamond",
      awakened: "Awakened"
    },
    labels: {
      shellTitle: "System Core",
      dashboardTitle: "Player Dashboard",
      dashboardText: "Your current RPG growth state, quick actions, and active threats.",
      arcPanelTitle: "Theme",
      questName: "Quest",
      bossName: "Boss",
      reviewName: "Review",
      xpName: "XP"
    }
  },
  {
    id: "knight",
    name: "Knight",
    tagline: "Honor, trials, armor, kingdoms, and disciplined ascent.",
    className: "theme-knight",
    fontLabel: "Old-style serif",
    rankNames: {
      bronze: "Squire",
      silver: "Knight",
      gold: "Royal Guard",
      platinum: "Champion",
      diamond: "Legend",
      awakened: "Sovereign"
    },
    labels: {
      shellTitle: "Command Hall",
      dashboardTitle: "Knight's Ledger",
      dashboardText: "Your duties, royal quests, victories, and active sieges.",
      arcPanelTitle: "Order",
      questName: "Royal Quest",
      bossName: "Siege",
      reviewName: "Reflection",
      xpName: "Renown"
    }
  },
  {
    id: "mage",
    name: "Mage",
    tagline: "Spellcraft, study, ritual, mastery, and ancient knowledge.",
    className: "theme-mage",
    fontLabel: "Arcane serif",
    rankNames: {
      bronze: "Apprentice",
      silver: "Arcanist",
      gold: "Spellbinder",
      platinum: "Archmage",
      diamond: "Sage",
      awakened: "Ascendant"
    },
    labels: {
      shellTitle: "Astral Grimoire",
      dashboardTitle: "Arcane Observatory",
      dashboardText: "Your spells, rituals, mana, arcane quests, and active trials.",
      arcPanelTitle: "School",
      questName: "Arcane Quest",
      bossName: "Trial",
      reviewName: "Divination",
      xpName: "Mana"
    }
  },
  {
    id: "anime_dark",
    name: "Shadowborne",
    tagline: "Neon shadows, supernatural missions, corruption, and awakened power.",
    className: "theme-anime-dark",
    fontLabel: "Condensed action sans",
    rankNames: {
      bronze: "Rookie",
      silver: "Trainee",
      gold: "Hunter",
      platinum: "Elite",
      diamond: "Awakened",
      awakened: "Legend"
    },
    labels: {
      shellTitle: "Shadowborne",
      dashboardTitle: "Awakening Interface",
      dashboardText: "Your missions, power gauge, corruption, and active final encounters.",
      arcPanelTitle: "Shadow Aspect",
      questName: "Story Mission",
      bossName: "Final Encounter",
      reviewName: "Episode Record",
      xpName: "Power"
    }
  },
  {
    id: "berserker",
    name: "Beserker",
    tagline: "Rage, iron, fire, shattered stone, and strength forged through battle.",
    className: "theme-berserker",
    fontLabel: "Heavy tactical sans",
    rankNames: {
      bronze: "Initiate",
      silver: "Striker",
      gold: "Breaker",
      platinum: "Ravager",
      diamond: "Warlord",
      awakened: "Unbroken"
    },
    labels: {
      shellTitle: "Beserker",
      dashboardTitle: "Rage Command",
      dashboardText: "Your training, hunts, rage, battle orders, and active war challenges.",
      arcPanelTitle: "Warpath",
      questName: "Hunt",
      bossName: "War Challenge",
      reviewName: "Battle Record",
      xpName: "Rage"
    }
  },
  {
    id: "muse",
    name: "Muse",
    tagline: "Creativity, beauty, music, inspiration, and graceful self-expression.",
    className: "theme-muse",
    fontLabel: "Editorial serif",
    rankNames: {
      bronze: "Bloom",
      silver: "Muse",
      gold: "Siren",
      platinum: "Empress",
      diamond: "Oracle",
      awakened: "Divine"
    },
    labels: {
      shellTitle: "Muse",
      dashboardTitle: "Creative Atelier",
      dashboardText: "Your practices, inspirations, radiance, daily intentions, and active masterpieces.",
      arcPanelTitle: "Medium",
      questName: "Inspiration",
      bossName: "Masterpiece",
      reviewName: "Creative Reflection",
      xpName: "Radiance"
    }
  },
  {
    id: "futuristic",
    name: "Futuristic",
    tagline: "Holograms, artificial intelligence, cybernetics, and advanced system control.",
    className: "theme-futuristic",
    fontLabel: "Tech mono",
    rankNames: {
      bronze: "User",
      silver: "Runner",
      gold: "Operator",
      platinum: "Synth",
      diamond: "Architect",
      awakened: "Transcendent"
    },
    labels: {
      shellTitle: "Neural Core",
      dashboardTitle: "Command Interface",
      dashboardText: "Your protocols, operations, system charge, daily directives, and active threat events.",
      arcPanelTitle: "Interface",
      questName: "Operation",
      bossName: "Threat Event",
      reviewName: "Diagnostic",
      xpName: "Charge"
    }
  }
];

export const MAIN_ARCS: MainArc[] = [
  {
    id: "warrior",
    name: "Warrior Arc",
    description: "Build physical power, consistency, and visible progress.",
    primaryStats: ["strength", "vitality"]
  },
  {
    id: "scholar",
    name: "Scholar Arc",
    description: "Grow through learning, focus, and deliberate practice.",
    primaryStats: ["intelligence"]
  },
  {
    id: "guardian",
    name: "Guardian Arc",
    description: "Protect energy, health, routines, and long-term stability.",
    primaryStats: ["vitality", "strength"]
  },
  {
    id: "builder",
    name: "Builder Arc",
    description: "Improve finances, career momentum, and useful systems.",
    primaryStats: ["wealth", "intelligence"]
  },
  {
    id: "leader",
    name: "Leader Arc",
    description: "Develop confidence, communication, and social presence.",
    primaryStats: ["charisma", "wealth"]
  },
  {
    id: "creator",
    name: "Creator Arc",
    description: "Make more things and turn imagination into practice.",
    primaryStats: ["intelligence", "charisma"]
  }
];

export const PRESET_POSITIVE_TASKS: PositiveTask[] = [
  {
    id: "strength-workout",
    title: "Complete a workout",
    stat: "strength",
    baseXp: 80,
    tags: ["fitness", "training"]
  },
  {
    id: "study-session",
    title: "Study for 30 minutes",
    stat: "intelligence",
    baseXp: 60,
    tags: ["learning", "focus"]
  },
  {
    id: "creative-practice",
    title: "Practice a creative skill",
    description: "Creativity belongs under Intelligence in Awaken.",
    stat: "intelligence",
    baseXp: 55,
    tags: ["creativity", "practice"]
  },
  {
    id: "sleep-routine",
    title: "Follow sleep routine",
    stat: "vitality",
    baseXp: 50,
    tags: ["health", "recovery"]
  },
  {
    id: "money-review",
    title: "Review spending or budget",
    stat: "wealth",
    baseXp: 45,
    tags: ["finance", "planning"]
  },
  {
    id: "reach-out",
    title: "Reach out to someone",
    stat: "charisma",
    baseXp: 40,
    tags: ["social", "connection"]
  }
];

export const NEGATIVE_ACTION_REASONS: NegativeActionReason[] = [
  "stress",
  "boredom",
  "fatigue",
  "social_pressure",
  "avoidance",
  "poor_planning",
  "environment",
  "unknown"
];

export const NEGATIVE_ACTION_REASON_LABELS: Record<NegativeActionReason, string> = {
  stress: "Stress",
  boredom: "Boredom",
  fatigue: "Fatigue",
  social_pressure: "Social pressure",
  avoidance: "Avoidance",
  poor_planning: "Poor planning",
  environment: "Environment",
  unknown: "Unknown"
};

export const PRESET_NEGATIVE_ACTIONS: NegativeAction[] = [
  {
    id: "skip-workout",
    title: "Skipped planned workout",
    stat: "strength",
    xpPenalty: 45,
    commonReasons: ["fatigue", "poor_planning", "avoidance"],
    tags: ["fitness", "missed-plan"]
  },
  {
    id: "doomscrolling",
    title: "Doomscrolling",
    stat: "intelligence",
    xpPenalty: 35,
    commonReasons: ["boredom", "avoidance", "environment"],
    tags: ["focus", "distraction"]
  },
  {
    id: "poor-sleep-choice",
    title: "Stayed up too late",
    stat: "vitality",
    xpPenalty: 50,
    commonReasons: ["stress", "boredom", "poor_planning"],
    tags: ["sleep", "recovery"]
  },
  {
    id: "impulse-spend",
    title: "Impulse spending",
    stat: "wealth",
    xpPenalty: 40,
    commonReasons: ["stress", "boredom", "environment"],
    tags: ["finance", "impulse"]
  },
  {
    id: "avoided-conversation",
    title: "Avoided an important conversation",
    stat: "charisma",
    xpPenalty: 35,
    commonReasons: ["avoidance", "stress", "social_pressure"],
    tags: ["social", "communication"]
  }
];

export const IDEAL_BUILD_PRESETS: IdealBuildPreset[] = [
  {
    id: "balanced-growth",
    name: "Balanced Growth",
    description: "A flexible build that keeps every normal stat moving.",
    focusStats: ["strength", "intelligence", "vitality", "wealth", "charisma"],
    suggestedArcIds: ["warrior", "scholar", "builder", "leader"]
  },
  {
    id: "deep-work-builder",
    name: "Deep Work Builder",
    description: "Best for study, career progress, creative output, and money habits.",
    focusStats: ["intelligence", "wealth", "vitality"],
    suggestedArcIds: ["scholar", "builder", "creator"]
  },
  {
    id: "social-athlete",
    name: "Social Athlete",
    description: "Best for confidence, body goals, energy, and stronger relationships.",
    focusStats: ["strength", "vitality", "charisma"],
    suggestedArcIds: ["warrior", "guardian", "leader"]
  }
];
