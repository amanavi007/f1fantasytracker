import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminRequest } from "@/lib/admin-auth";
import { openAIVisionParse } from "@/lib/parser";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function lower(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const payloadSchema = z.object({
  screenshotId: z.string(),
  forcedGpName: z.string().optional()
});

export async function POST(request: Request) {
  try {
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
    .map((v) => lower(v));

  let mappedPlayerId: string | null = null;
  let mappedTeam1Name: string | null = null;
  let mappedTeam2Name: string | null = null;

  const [{ data: aliasRows }, { data: playerRows }, { data: teamRows }] = await Promise.all([
    supabase.from("player_aliases").select("player_id, alias"),
    supabase.from("players").select("id, display_name").eq("is_active", true),
    supabase.from("fantasy_teams").select("player_id, slot, team_name").eq("is_active", true)
  ]);

  const playerNameById = new Map((playerRows ?? []).map((row) => [row.id, row.display_name]));
  const teamByName = new Map((teamRows ?? []).map((row) => [lower(row.team_name), row]));
  const playerIdByAlias = new Map((aliasRows ?? []).map((row) => [lower(row.alias), row.player_id]));

  for (const row of aliasRows ?? []) {
    if (accountCandidates.includes(lower(row.alias))) {
      mappedPlayerId = row.player_id;
      break;
    }
  }

  if (!mappedPlayerId) {
    for (const row of playerRows ?? []) {
      if (accountCandidates.includes(lower(row.display_name))) {
        mappedPlayerId = row.id;
        break;
      }
    }
  }

  if (!mappedPlayerId && parsed.detectedTeamNames.length > 0) {
    const normalizedDetectedNames = parsed.detectedTeamNames.map((name) => lower(name));
    const candidate = (teamRows ?? []).find((team) => normalizedDetectedNames.includes(lower(team.team_name)));
    if (candidate) mappedPlayerId = candidate.player_id;
  }

  const playerTeams = (teamRows ?? []).filter((team) => team.player_id === mappedPlayerId);
  mappedTeam1Name = playerTeams.find((team) => team.slot === 1)?.team_name ?? null;
  mappedTeam2Name = playerTeams.find((team) => team.slot === 2)?.team_name ?? null;

  const scoreFromEntity1 = asNumber(parsed.parsedEntities.team_1_score);
  const scoreFromEntity2 = asNumber(parsed.parsedEntities.team_2_score);
  const score1 = scoreFromEntity1 !== null
    ? scoreFromEntity1
    : Number.isFinite(parsed.detectedScores[0])
      ? parsed.detectedScores[0]
      : null;
  const score2 = scoreFromEntity2 !== null
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
        team_name:
          mappedTeam1Name ??
          (typeof parsed.parsedEntities.team_1_name === "string" ? parsed.parsedEntities.team_1_name : null) ??
          parsed.detectedTeamNames[0] ??
          null,
        score: score1,
        source_screenshot_id: screenshot.id,
        source_parsed_result_id: insertedParsed.id,
        is_manual_override: false
      },
      {
        gp_id: screenshot.gp_id,
        player_id: mappedPlayerId,
        team_slot: 2,
        team_name:
          mappedTeam2Name ??
          (typeof parsed.parsedEntities.team_2_name === "string" ? parsed.parsedEntities.team_2_name : null) ??
          parsed.detectedTeamNames[1] ??
          null,
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

  // Multi-team assignment path for league-table screenshots with many rows.
  const leaderboardRows = Array.isArray(parsed.parsedEntities.leaderboard_rows)
    ? parsed.parsedEntities.leaderboard_rows.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
      )
    : [];

  let leaderboardAssignments = 0;

  if (insertedParsed?.id && leaderboardRows.length > 0) {
    const perPlayer = new Map<string, { team1Score: number | null; team2Score: number | null; seenSlots: Set<number> }>();

    for (const row of leaderboardRows) {
      const teamName = typeof row.team_name === "string" ? row.team_name : null;
      const ownerName = typeof row.owner_name === "string" ? row.owner_name : null;
      const score = asNumber(row.score);
      const slotHint = typeof row.team_slot_hint === "string" ? row.team_slot_hint.toUpperCase() : null;

      if (!teamName || score === null) continue;

      const teamMatch = teamByName.get(lower(teamName));
      let playerId = teamMatch?.player_id ?? null;

      if (!playerId && ownerName) {
        playerId = playerIdByAlias.get(lower(ownerName)) ?? null;
      }
      if (!playerId && ownerName) {
        const playerByName = (playerRows ?? []).find((player) => lower(player.display_name) === lower(ownerName));
        playerId = playerByName?.id ?? null;
      }

      if (!playerId) continue;

      const existing = perPlayer.get(playerId) ?? { team1Score: null, team2Score: null, seenSlots: new Set<number>() };

      const slotFromDb = teamMatch?.slot;
      let slot = slotFromDb;
      if (!slot && slotHint === "T1") slot = 1;
      if (!slot && slotHint === "T2") slot = 2;
      if (!slot) slot = existing.seenSlots.has(1) ? 2 : 1;

      if (slot === 1) existing.team1Score = score;
      if (slot === 2) existing.team2Score = score;
      existing.seenSlots.add(slot);
      perPlayer.set(playerId, existing);
    }

    for (const [playerId, data] of perPlayer.entries()) {
      const playerTeams = (teamRows ?? []).filter((team) => team.player_id === playerId);
      const row1 = {
        gp_id: screenshot.gp_id,
        player_id: playerId,
        team_slot: 1,
        team_name: playerTeams.find((team) => team.slot === 1)?.team_name ?? null,
        score: data.team1Score,
        source_screenshot_id: screenshot.id,
        source_parsed_result_id: insertedParsed.id,
        is_manual_override: false
      };
      const row2 = {
        gp_id: screenshot.gp_id,
        player_id: playerId,
        team_slot: 2,
        team_name: playerTeams.find((team) => team.slot === 2)?.team_name ?? null,
        score: data.team2Score,
        source_screenshot_id: screenshot.id,
        source_parsed_result_id: insertedParsed.id,
        is_manual_override: false
      };

      await supabase.from("gp_team_scores").upsert([row1, row2], { onConflict: "gp_id,player_id,team_slot" });
      await supabase.from("gp_entries").upsert(
        {
          gp_id: screenshot.gp_id,
          player_id: playerId,
          submission_status: data.team1Score !== null && data.team2Score !== null ? "both_detected" : "needs_review",
          mapped_alias: playerNameById.get(playerId) ?? null,
          notes: "Auto-mapped from leaderboard rows",
          reviewed_at: null,
          reviewed_by: null
        },
        { onConflict: "gp_id,player_id" }
      );

      leaderboardAssignments += 1;
    }
  }

    return NextResponse.json({
      parser: process.env.VISION_MODEL || "gpt-4.1-mini",
      parsed,
      autoAssignment: {
        mappedPlayerId,
        autoAssigned,
        score1,
        score2,
        leaderboardAssignments
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parse error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
