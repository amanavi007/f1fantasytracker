import { NextResponse } from "next/server";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ gpId: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { gpId } = await params;
  const supabase = getSupabaseServerClient();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "screenshots";

  const { data: gp, error: gpError } = await supabase.from("gps").select("id").eq("id", gpId).maybeSingle();
  if (gpError || !gp) {
    return NextResponse.json({ error: "GP not found." }, { status: 404 });
  }

  const { data: screenshots, error: screenshotsError } = await supabase
    .from("screenshot_uploads")
    .select("id, storage_path")
    .eq("gp_id", gpId);

  if (screenshotsError) {
    return NextResponse.json({ error: screenshotsError.message }, { status: 400 });
  }

  const storagePaths = (screenshots ?? []).map((row) => row.storage_path).filter(Boolean);
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from(bucket).remove(storagePaths);
    if (storageError) {
      return NextResponse.json({ error: storageError.message }, { status: 400 });
    }
  }

  const [correctionsRes, snapshotsRes, punishmentRes, scoresRes, entriesRes, screenshotsResDelete, gpsRes] =
    await Promise.all([
      supabase.from("correction_logs").delete().eq("gp_id", gpId),
      supabase.from("gp_snapshot_history").delete().eq("gp_id", gpId),
      supabase.from("punishment_results").delete().eq("gp_id", gpId),
      supabase.from("gp_team_scores").delete().eq("gp_id", gpId),
      supabase.from("gp_entries").delete().eq("gp_id", gpId),
      supabase.from("screenshot_uploads").delete().eq("gp_id", gpId),
      supabase
        .from("gps")
        .update({ status: "draft", finalized_at: null, finalized_by: null, updated_at: new Date().toISOString() })
        .eq("id", gpId)
    ]);

  const firstError =
    correctionsRes.error ??
    snapshotsRes.error ??
    punishmentRes.error ??
    scoresRes.error ??
    entriesRes.error ??
    screenshotsResDelete.error ??
    gpsRes.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    gpId,
    deleted: {
      screenshots: screenshotsResDelete.count ?? storagePaths.length,
      teamScores: scoresRes.count ?? 0,
      entries: entriesRes.count ?? 0,
      corrections: correctionsRes.count ?? 0,
      snapshots: snapshotsRes.count ?? 0,
      punishmentResults: punishmentRes.count ?? 0
    }
  });
}
