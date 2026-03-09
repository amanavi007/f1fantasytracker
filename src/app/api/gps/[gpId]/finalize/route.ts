import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { computePunishmentForGp } from "@/lib/scoring";
import { getGpTeamScores, getLeagueSettings, getPlayers } from "@/lib/data";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ gpId: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { gpId } = await params;
  const supabase = getSupabaseServerClient();
  const [players, gpTeamScores, settings] = await Promise.all([getPlayers(), getGpTeamScores(gpId), getLeagueSettings()]);

  const result = computePunishmentForGp(gpId, players, gpTeamScores, settings.tieRule);

  await Promise.all([
    supabase
      .from("punishment_results")
      .upsert(
        {
          gp_id: gpId,
          loser_player_ids: result.loserPlayerIds,
          second_last_player_ids: result.secondLastPlayerIds,
          tie_rule: result.tieRule,
          requires_manual_decision: result.requiresManualDecision,
          locked: true,
          finalized_snapshot: {
            gpId,
            loserPlayerIds: result.loserPlayerIds,
            secondLastPlayerIds: result.secondLastPlayerIds,
            computedAt: new Date().toISOString()
          }
        },
        { onConflict: "gp_id" }
      ),
    supabase
      .from("gps")
      .update({ status: "finalized", finalized_at: new Date().toISOString() })
      .eq("id", gpId)
  ]);

  return NextResponse.json({
    gpId,
    locked: true,
    punishmentResult: result,
    note: "This is deterministic app logic. AI extraction does not decide punishments."
  });
}
