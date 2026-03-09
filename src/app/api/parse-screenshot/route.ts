import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { openAIVisionParse } from "@/lib/parser";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  screenshotId: z.string(),
  forcedGpName: z.string().optional()
});

export async function POST(request: Request) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const payload = payloadSchema.parse(body);
  const supabase = getSupabaseServerClient();

  const { data: screenshot, error: screenshotError } = await supabase
    .from("screenshot_uploads")
    .select("id, gp_id, file_name, storage_path")
    .eq("id", payload.screenshotId)
    .maybeSingle();

  if (screenshotError || !screenshot) {
    return NextResponse.json({ error: "Screenshot not found." }, { status: 404 });
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "screenshots";
  const { data: signed, error: signedError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(screenshot.storage_path, 60 * 10);

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate signed URL for screenshot." }, { status: 500 });
  }

  const parsed = await openAIVisionParse({
    screenshotId: screenshot.id,
    imageUrl: signed.signedUrl,
    forcedGpName: payload.forcedGpName
  });

  const { data: insertedParsed } = await supabase
    .from("parsed_screenshot_results")
    .insert({
      screenshot_id: screenshot.id,
      parser_name: process.env.VISION_MODEL || "gpt-4.1-mini",
      gp_name: parsed.gpName ?? null,
      detected_account_name: parsed.detectedAccountName ?? null,
      detected_team_names: parsed.detectedTeamNames,
      detected_scores: parsed.detectedScores,
      screenshot_type: parsed.screenshotType ?? null,
      parsed_entities: parsed.parsedEntities,
      confidence_by_field: parsed.confidenceByField,
      missing_fields: parsed.missingFields,
      warnings: parsed.warnings,
      approved: false
    })
    .select("id")
    .single();

  const accountCandidates = [
    parsed.detectedAccountName,
    typeof parsed.parsedEntities.account === "string" ? parsed.parsedEntities.account : undefined
  ]
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase().trim());

  let mappedPlayerId: string | null = null;
  let mappedTeam1Name: string | null = null;
  let mappedTeam2Name: string | null = null;

  const [{ data: aliasRows }, { data: playerRows }, { data: teamRows }] = await Promise.all([
    supabase.from("player_aliases").select("player_id, alias"),
    supabase.from("players").select("id, display_name").eq("is_active", true),
    supabase.from("fantasy_teams").select("player_id, slot, team_name").eq("is_active", true)
  ]);

  for (const row of aliasRows ?? []) {
    if (accountCandidates.includes(row.alias.toLowerCase().trim())) {
      mappedPlayerId = row.player_id;
      break;
    }
  }

  if (!mappedPlayerId) {
    for (const row of playerRows ?? []) {
      if (accountCandidates.includes(row.display_name.toLowerCase().trim())) {
        mappedPlayerId = row.id;
        break;
      }
    }
  }

  if (!mappedPlayerId && parsed.detectedTeamNames.length > 0) {
    const normalizedDetectedNames = parsed.detectedTeamNames.map((name) => name.toLowerCase().trim());
    const candidate = (teamRows ?? []).find((team) => normalizedDetectedNames.includes(team.team_name.toLowerCase().trim()));
    if (candidate) mappedPlayerId = candidate.player_id;
  }

  const playerTeams = (teamRows ?? []).filter((team) => team.player_id === mappedPlayerId);
  mappedTeam1Name = playerTeams.find((team) => team.slot === 1)?.team_name ?? null;
  mappedTeam2Name = playerTeams.find((team) => team.slot === 2)?.team_name ?? null;

  const scoreFromEntity1 = Number(parsed.parsedEntities.team_1_score);
  const scoreFromEntity2 = Number(parsed.parsedEntities.team_2_score);
  const score1 = Number.isFinite(scoreFromEntity1)
    ? scoreFromEntity1
    : Number.isFinite(parsed.detectedScores[0])
      ? parsed.detectedScores[0]
      : null;
  const score2 = Number.isFinite(scoreFromEntity2)
    ? scoreFromEntity2
    : Number.isFinite(parsed.detectedScores[1])
      ? parsed.detectedScores[1]
      : null;

  let autoAssigned = false;

  if (mappedPlayerId && insertedParsed?.id) {
    const upsertRows = [
      {
        gp_id: screenshot.gp_id,
        player_id: mappedPlayerId,
        team_slot: 1,
        team_name: mappedTeam1Name ?? (parsed.parsedEntities.team_1_name as string | null) ?? parsed.detectedTeamNames[0] ?? null,
        score: score1,
        source_screenshot_id: screenshot.id,
        source_parsed_result_id: insertedParsed.id,
        is_manual_override: false
      },
      {
        gp_id: screenshot.gp_id,
        player_id: mappedPlayerId,
        team_slot: 2,
        team_name: mappedTeam2Name ?? (parsed.parsedEntities.team_2_name as string | null) ?? parsed.detectedTeamNames[1] ?? null,
        score: score2,
        source_screenshot_id: screenshot.id,
        source_parsed_result_id: insertedParsed.id,
        is_manual_override: false
      }
    ];

    await supabase.from("gp_team_scores").upsert(upsertRows, { onConflict: "gp_id,player_id,team_slot" });

    const hasBothScores = score1 !== null && score2 !== null;
    await supabase.from("gp_entries").upsert(
      {
        gp_id: screenshot.gp_id,
        player_id: mappedPlayerId,
        submission_status: hasBothScores ? "both_detected" : "needs_review",
        mapped_alias: parsed.detectedAccountName ?? null,
        notes: hasBothScores ? null : "Auto-parse mapped player but one score is missing",
        reviewed_at: null,
        reviewed_by: null
      },
      { onConflict: "gp_id,player_id" }
    );

    autoAssigned = true;
  }

  return NextResponse.json({
    parser: process.env.VISION_MODEL || "gpt-4.1-mini",
    parsed,
    autoAssignment: {
      mappedPlayerId,
      autoAssigned,
      score1,
      score2
    }
  });
}
