import type { ArcThemeId } from "@/types/awaken";

export const CANONICAL_FEATURES = {
  "/": "Home", "/stats": "Stats", "/tasks": "Tasks", "/quests": "Quests",
  "/bosses": "Bosses", "/reviews": "Reviews", "/analytics": "Analytics", "/settings": "Settings"
} as const;

type FeatureRoute = keyof typeof CANONICAL_FEATURES;

const THEME_LABELS: Partial<Record<ArcThemeId, Partial<Record<FeatureRoute,string>>>> = {
  mage: { "/":"Observatory", "/stats":"Arcana", "/tasks":"Spells", "/quests":"Arcane Quests", "/bosses":"Trials", "/reviews":"Divinations", "/analytics":"Constellations" },
  anime_dark: { "/":"Awakening", "/stats":"Power", "/tasks":"Missions", "/quests":"Story Missions", "/bosses":"Final Encounters", "/reviews":"Episode Records", "/analytics":"Threat Analysis" },
  berserker: { "/":"War Camp", "/stats":"Warrior", "/tasks":"Training", "/quests":"Hunts", "/bosses":"War Challenges", "/reviews":"Battle Records", "/analytics":"War Ledger" },
  muse: { "/":"Atelier", "/stats":"Bloom", "/tasks":"Practices", "/quests":"Inspirations", "/bosses":"Masterpieces", "/reviews":"Reflections", "/analytics":"Gallery" },
  futuristic: { "/":"Command", "/stats":"Cybernetics", "/tasks":"Protocols", "/quests":"Operations", "/bosses":"Threat Events", "/reviews":"Diagnostics", "/analytics":"Data Matrix" }
};

export function getThemeFeatureLabel(theme: ArcThemeId, route: FeatureRoute) {
  return THEME_LABELS[theme]?.[route] ?? CANONICAL_FEATURES[route];
}

export function getThemeFeaturePair(theme: ArcThemeId, route: FeatureRoute) {
  const themed = getThemeFeatureLabel(theme, route); const canonical = CANONICAL_FEATURES[route];
  return { themed, canonical, display: themed === canonical ? canonical : `${themed} (${canonical})` };
}
