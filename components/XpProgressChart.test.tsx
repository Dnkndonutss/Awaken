import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ActivityEvent } from "@/hooks/use-awaken-state";
import { XpProgressChart } from "./XpProgressChart";

function currentXpEvent(): ActivityEvent {
  const createdAt = new Date().toISOString();
  return {
    id: "responsive-event",
    name: "Responsive event",
    kind: "xp",
    result: {
      xpChanged: 50,
      affectedStat: "strength",
      oldStatLevel: 0,
      newStatLevel: 0,
      leveledUp: false,
      leveledDown: false,
      updatedOverallXp: 50,
      updatedOverallLevel: 0,
      updatedRankId: "bronze",
      logEntry: { id: "responsive-event", createdAt, stat: "strength", xpAmount: 50, sourceType: "positive_task" },
      updatedProfile: { id: "owner", displayName: "Owner", mainArcId: "warrior", arcThemeId: "minimal", disciplineTierId: "untrained", disciplineXp: 0, overallXp: 50, overallLevel: 0, rankId: "bronze", stats: [], createdAt }
    }
  };
}

describe("XP progression chart UI", () => {
  it("uses a scalable viewBox and fluid width for mobile layouts", () => {
    const markup = renderToStaticMarkup(<XpProgressChart activityLog={[currentXpEvent()]} xpName="XP" />);
    expect(markup).toContain('viewBox="0 0 760 330"');
    expect(markup).toContain("min-h-64 w-full");
    expect(markup).not.toContain("width:760px");
  });

  it("renders guidance instead of sample values when activity is empty", () => {
    const markup = renderToStaticMarkup(<XpProgressChart activityLog={[]} xpName="XP" />);
    expect(markup).toContain("No XP activity in this range yet");
    expect(markup).not.toContain("progression chart</title>");
  });
});
