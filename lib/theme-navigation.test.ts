import { describe, expect, it } from "vitest";
import { getThemeFeatureLabel, getThemeFeaturePair } from "./theme-navigation";

describe("theme navigation terminology",()=>{
  it("explains Mage labels using canonical feature names",()=>{expect(getThemeFeaturePair("mage","/stats")).toEqual({themed:"Arcana",canonical:"Stats",display:"Arcana (Stats)"});expect(getThemeFeaturePair("mage","/tasks").display).toBe("Spells (Tasks)");expect(getThemeFeaturePair("mage","/bosses").display).toBe("Trials (Bosses)")});
  it("matches every themed navigation surface",()=>{expect(getThemeFeatureLabel("anime_dark","/quests")).toBe("Story Missions");expect(getThemeFeatureLabel("berserker","/tasks")).toBe("Training");expect(getThemeFeatureLabel("muse","/analytics")).toBe("Gallery");expect(getThemeFeatureLabel("futuristic","/reviews")).toBe("Diagnostics")});
  it("does not add redundant aliases to canonical themes",()=>expect(getThemeFeaturePair("minimal","/stats").display).toBe("Stats"));
});
