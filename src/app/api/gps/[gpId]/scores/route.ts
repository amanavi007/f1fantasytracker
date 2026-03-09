import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  playerId: z.string().uuid(),
  team1Score: z.number().nullable(),
  team2Score: z.number().nullable()
});

export async function PUT(request: Request, { params }: { params: Promise<{ gpId: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { gpId } = await params;
  const body = await request.json();
  const payload = schema.parse(body);
  const supabase = getSupabaseServerClient();

  const rows = [
    {
      gp_id: gpId,
      player_id: payload.playerId,
      team_slot: 1,
      score: payload.team1Score,
      is_manual_override: true
    },
    {
      gp_id: gpId,
      player_id: payload.playerId,
      team_slot: 2,
      score: payload.team2Score,
      is_manual_override: true
    }
  ];

  const { error } = await supabase.from("gp_team_scores").upsert(rows, { onConflict: "gp_id,player_id,team_slot" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
