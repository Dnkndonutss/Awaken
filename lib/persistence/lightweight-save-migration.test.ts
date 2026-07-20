import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202607180001_lightweight_state_saves.sql"),
  "utf8"
);

describe("lightweight state save migration", () => {
  it("keeps ordinary saves snapshot-only", () => {
    expect(migration).toContain("create or replace function public.save_awaken_state");
    expect(migration).not.toContain("perform public.sync_awaken_relational");
  });

  it("does not expose the write RPC to anonymous callers", () => {
    expect(migration).toContain("from public, anon");
    expect(migration).toContain("to authenticated, service_role");
  });
});
