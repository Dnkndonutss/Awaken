import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const saveSchema = z.object({ state: z.record(z.string(), z.unknown()), revision: z.number().int().min(0), operationId: z.string().uuid(), dataVersion: z.number().int().positive() });

async function userClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await userClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("awaken_states").select("state,revision,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to load progress." }, { status: 500 });
  return NextResponse.json(data ? { state: data.state, revision: data.revision, updatedAt: data.updated_at } : null);
}

export async function PUT(request: Request) {
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid save request." }, { status: 400 });
  const { supabase, user } = await userClient();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("save_awaken_state", { p_state: parsed.data.state, p_expected_revision: parsed.data.revision, p_operation_id: parsed.data.operationId, p_data_version: parsed.data.dataVersion });
  if (error?.code === "40001") return NextResponse.json({ error: "Progress changed on another device. Reload to reconcile it." }, { status: 409 });
  if (error || !data?.[0]) return NextResponse.json({ error: "Unable to save progress." }, { status: 500 });
  return NextResponse.json({ state: data[0].state, revision: data[0].revision, updatedAt: data[0].updated_at });
}
