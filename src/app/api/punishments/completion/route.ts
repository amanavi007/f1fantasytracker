import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  gpId: z.string().uuid(),
  playerId: z.string().uuid(),
  completed: z.boolean(),
  notes: z.string().optional()
});

export async function PATCH(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const payload = schema.parse(await request.json());
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.from("punishment_completions").upsert(
    {
      gp_id: payload.gpId,
      player_id: payload.playerId,
      completed: payload.completed,
      completed_at: payload.completed ? new Date().toISOString() : null,
      completed_by: auth.method ?? "admin",
      notes: payload.notes ?? null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "gp_id,player_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
