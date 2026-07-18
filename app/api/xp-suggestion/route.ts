import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import {
  MANUAL_XP_LIMITS,
  PRESET_NEGATIVE_ACTIONS,
  PRESET_POSITIVE_TASKS,
  STAT_CATEGORIES,
  STAT_CATEGORY_LABELS
} from "@/data/awaken-constants";
import type { StatCategory } from "@/types/awaken";

export const runtime = "nodejs";

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_TASK_LENGTH = 240;
const validStats = new Set<string>(STAT_CATEGORIES);
const tierLimits: Record<"positive" | "negative", Record<string, { minimum: number; maximum: number }>> = {
  positive: {
    minor: { minimum: 15, maximum: 30 },
    routine: { minimum: 35, maximum: 55 },
    substantial: { minimum: 60, maximum: 90 },
    demanding: { minimum: 100, maximum: 140 },
    milestone: { minimum: 150, maximum: 220 },
    exceptional: { minimum: 250, maximum: 350 },
    legendary: { minimum: 400, maximum: 500 }
  },
  negative: {
    minor: { minimum: 10, maximum: 25 },
    routine: { minimum: 30, maximum: 50 },
    substantial: { minimum: 55, maximum: 80 },
    demanding: { minimum: 85, maximum: 110 }
  }
};

const xpSuggestionSchema = {
  type: "object",
  properties: {
    xp: {
      type: "integer",
      description: "The recommended absolute XP value within the supplied range."
    },
    confidence: {
      type: "integer",
      description: "Confidence from 0 to 100 based only on information present in the task."
    },
    tier: {
      type: "string",
      enum: ["minor", "routine", "substantial", "demanding", "milestone", "exceptional", "legendary"],
      description: "The achievement or setback tier selected from the supplied universal scale."
    },
    suggestedStat: {
      type: "string",
      enum: STAT_CATEGORIES,
      description: "The single Awaken stat most directly trained or harmed by the action."
    },
    archetype: {
      type: "string",
      description: "A concise 2 to 5 word classification of the action."
    },
    reason: {
      type: "string",
      description: "One short sentence explaining the XP recommendation."
    },
    signals: {
      type: "array",
      items: { type: "string" },
      description: "Two to four short scoring factors grounded in the task text."
    }
  },
  required: ["xp", "confidence", "tier", "suggestedStat", "archetype", "reason", "signals"]
};

type RequestBody = {
  title?: unknown;
  actionType?: unknown;
};

type GeminiXpResult = {
  xp?: unknown;
  confidence?: unknown;
  tier?: unknown;
  suggestedStat?: unknown;
  archetype?: unknown;
  reason?: unknown;
  signals?: unknown;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart Awaken." },
      { status: 503 }
    );
  }

  let body: RequestBody;

  try {
    body = await request.json() as RequestBody;
  } catch {
    return NextResponse.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const actionType = body.actionType;

  if (title.length < 3 || title.length > MAX_TASK_LENGTH) {
    return NextResponse.json(
      { error: `Describe the task using between 3 and ${MAX_TASK_LENGTH} characters.` },
      { status: 400 }
    );
  }

  if (actionType !== "positive" && actionType !== "negative") {
    return NextResponse.json({ error: "Choose either a positive or negative action." }, { status: 400 });
  }

  const limits = MANUAL_XP_LIMITS[actionType];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      system_instruction: buildSystemInstruction(actionType, limits),
      input: `Analyze this ${actionType} Awaken action and recommend fair XP:\n\n${title}`,
      generation_config: {
        temperature: 0.2
      },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: xpSuggestionSchema
      }
    });

    const parsed = JSON.parse(interaction.output_text ?? "{}") as GeminiXpResult;
    const suggestion = normalizeSuggestion(parsed, actionType, limits);

    if (!suggestion) {
      throw new Error("Gemini returned an invalid XP suggestion.");
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Gemini XP analysis failed:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Gemini could not analyze this task. The local XP estimate is still available." },
      { status: 502 }
    );
  }
}

function buildSystemInstruction(
  actionType: "positive" | "negative",
  limits: { minimum: number; maximum: number }
) {
  const scale = actionType === "positive"
    ? "15-30 trivial or quick; 35-55 small focused action; 60-90 normal substantial task; 100-140 demanding session; 150-220 major multi-hour accomplishment; 250-350 exceptional endurance or major milestone such as completing a marathon; 400-500 rare life-defining achievement."
    : "10-25 mild setback; 30-50 moderate lapse; 55-80 serious setback; 85-110 severe or sustained setback.";

  return [
    "You calibrate XP for Awaken, a personal growth RPG.",
    `Score only the action described. This is a ${actionType} action.`,
    `XP must be an integer from ${limits.minimum} to ${limits.maximum}.`,
    `Scale: ${scale}`,
    "Consider duration, effort, difficulty, impact, intentionality, and whether the action was completed.",
    "Classify the tier before selecting XP, and keep XP inside that tier's range.",
    "Apply the same scale across physical, learning, creative, health, financial, career, and social actions.",
    "Score the completed action itself, not the person's identity, prestige, emotional wording, or unstated preparation.",
    "Repeated daily actions normally belong in routine or substantial tiers. Reserve milestone and higher tiers for genuinely uncommon outcomes.",
    "Do not reward dramatic wording, invent missing duration, or infer facts not stated.",
    "Stats: strength = physical training; intelligence = learning, focus, or creative skill; vitality = health and recovery; wealth = money or career; charisma = relationships and communication.",
    "Cross-category baselines: 30-minute workout 70-80, 30-minute focused study 55-65, creative practice 45-60, sleep routine 45-55, paying a bill 35-50, meaningful conversation 45-70, difficult multi-hour project 100-140, completing a marathon 250-350, earning a degree or publishing a major work 250-350.",
    "Negative baselines: skipped workout 45 XP, doomscrolling 35 XP, staying up late 50 XP, impulse spending 40 XP.",
    "Return grounded, concise factors and no advice beyond the required JSON fields."
  ].join(" ");
}

function normalizeSuggestion(
  result: GeminiXpResult,
  actionType: "positive" | "negative",
  limits: { minimum: number; maximum: number }
) {
  if (
    typeof result.xp !== "number" ||
    typeof result.confidence !== "number" ||
    typeof result.tier !== "string" ||
    typeof result.suggestedStat !== "string" ||
    !validStats.has(result.suggestedStat) ||
    typeof result.archetype !== "string" ||
    typeof result.reason !== "string" ||
    !Array.isArray(result.signals)
  ) {
    return null;
  }

  const selectedTierLimits = tierLimits[actionType][result.tier];

  if (!selectedTierLimits) {
    return null;
  }

  const suggestedStat = result.suggestedStat as StatCategory;
  const xp = clampNumber(
    result.xp,
    Math.max(limits.minimum, selectedTierLimits.minimum),
    Math.min(limits.maximum, selectedTierLimits.maximum)
  );
  const confidence = clampNumber(result.confidence, 20, 99);

  return {
    xp,
    confidence,
    suggestedStat,
    archetype: result.archetype.trim().slice(0, 80) || "General action",
    nearestPreset: getNearestPresetLabel(xp, actionType),
    reason: result.reason.trim().slice(0, 220),
    signals: [
      `${formatTier(result.tier)} tier: ${selectedTierLimits.minimum}-${selectedTierLimits.maximum} XP`,
      ...result.signals
    ]
      .filter((signal): signal is string => typeof signal === "string")
      .map((signal) => signal.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 4),
    source: "gemini" as const
  };
}

function formatTier(tier: string) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Gemini error";
}
