import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ state: z.record(z.string(), z.unknown()), mode: z.enum(["replace", "merge"]), operationId: z.string().uuid(), dataVersion: z.number().int().positive() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid backup." }, { status: 400 });
  if (parsed.data.mode === "merge") return NextResponse.json({ error: "Safe merge is not available for this data version. Choose replace." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("restore_awaken_state", { p_state: parsed.data.state, p_operation_id: parsed.data.operationId, p_data_version: parsed.data.dataVersion });
  if (error || !data?.[0]) return NextResponse.json({ error: "Restore failed; existing progress was not changed." }, { status: 500 });
  return NextResponse.json({ state: data[0].state, revision: data[0].revision, updatedAt: data[0].updated_at });
}
