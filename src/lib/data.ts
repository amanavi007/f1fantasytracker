import { buildGpRows, computePunishmentForGp, deriveSubmissionStatus } from "@/lib/scoring";
import { getSupabaseServerClient, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { CorrectionLog, Gp, GpEntry, GpTeamScore, ParsedScreenshotResult, Player, ScreenshotUpload, TieRule } from "@/lib/types";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function getLeagueSettings() {
  if (!hasSupabaseServerEnv()) {
    return {
      tieRule: "lower_best_team_loses" as TieRule,
      allowUnlockFinalizedGp: true
    };
  }

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("tie_rule, allow_unlock_finalized_gp")
    .limit(1)
    .maybeSingle();

  return {
    tieRule: (data?.tie_rule as TieRule | undefined) ?? "lower_best_team_loses",
    allowUnlockFinalizedGp: data?.allow_unlock_finalized_gp ?? true
  };
}

export async function getPlayers(): Promise<Player[]> {
  if (!hasSupabaseServerEnv()) return [];
  const supabase = getSupabaseServerClient();

  const [playersRes, aliasesRes, teamsRes] = await Promise.all([
    supabase
      .from("players")
      .select("id, display_name, real_name, avatar_url, join_gp_id, is_active, notes")
      .order("display_name", { ascending: true }),
    supabase.from("player_aliases").select("player_id, alias"),
    supabase.from("fantasy_teams").select("player_id, slot, team_name, is_active")
  ]);

  const aliasesByPlayer = new Map<string, string[]>();
  for (const alias of aliasesRes.data ?? []) {
    const existing = aliasesByPlayer.get(alias.player_id) ?? [];
    existing.push(alias.alias);
    aliasesByPlayer.set(alias.player_id, existing);
  }

  const teamsByPlayer = new Map<string, { team1Name: string; team2Name: string }>();
  for (const team of teamsRes.data ?? []) {
    if (!team.is_active) continue;
    const existing = teamsByPlayer.get(team.player_id) ?? { team1Name: "", team2Name: "" };
    if (team.slot === 1) existing.team1Name = team.team_name;
    if (team.slot === 2) existing.team2Name = team.team_name;
    teamsByPlayer.set(team.player_id, existing);
  }

  return (playersRes.data ?? []).map((player) => {
    const teams = teamsByPlayer.get(player.id) ?? { team1Name: "", team2Name: "" };
    return {
      id: player.id,
      displayName: player.display_name,
      realName: player.real_name ?? undefined,
      avatarUrl: player.avatar_url ?? undefined,
      joinGpId: player.join_gp_id ?? undefined,
      isActive: player.is_active,
      notes: player.notes ?? undefined,
      team1Name: teams.team1Name,
      team2Name: teams.team2Name,
      aliases: aliasesByPlayer.get(player.id) ?? []
    } satisfies Player;
  });
}

export async function getGps(): Promise<Gp[]> {
  if (!hasSupabaseServerEnv()) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("gps")
    .select("id, gp_name, race_date, status, round_no")
    .order("round_no", { ascending: true, nullsFirst: false })
    .order("race_date", { ascending: true, nullsFirst: false });

  return (data ?? []).map((gp) => ({
    id: gp.id,
    name: gp.gp_name,
    raceDate: gp.race_date ?? "",
    status: gp.status,
    round: gp.round_no ?? 0
  }));
}

export async function getGpTeamScores(gpId?: string): Promise<GpTeamScore[]> {
  if (!hasSupabaseServerEnv()) return [];
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("gp_team_scores")
    .select("id, gp_id, player_id, team_slot, team_name, score, source_screenshot_id, is_manual_override");

  if (gpId) query = query.eq("gp_id", gpId);

  const { data } = await query;
  return (data ?? []).map((score) => ({
    id: score.id,
    gpId: score.gp_id,
    playerId: score.player_id,
    teamSlot: score.team_slot,
    teamName: score.team_name ?? "",
    score: score.score === null ? null : Number(score.score),
    sourceScreenshotId: score.source_screenshot_id ?? undefined,
    needsReview: !score.is_manual_override && score.score === null
  }));
}

export async function getScreenshotUploads(gpId?: string): Promise<ScreenshotUpload[]> {
  if (!hasSupabaseServerEnv()) return [];
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("screenshot_uploads")
    .select("id, gp_id, file_name, storage_path, uploaded_at, uploaded_by, file_hash")
    .order("uploaded_at", { ascending: false });

  if (gpId) query = query.eq("gp_id", gpId);

  const { data } = await query;
  return (data ?? []).map((shot) => ({
    id: shot.id,
    gpId: shot.gp_id,
    fileName: shot.file_name,
    storagePath: shot.storage_path,
    uploadedAt: shot.uploaded_at,
    uploadedBy: shot.uploaded_by,
    hash: shot.file_hash ?? ""
  }));
}

export async function getParsedResultsByScreenshotIds(screenshotIds: string[]): Promise<ParsedScreenshotResult[]> {
  if (!hasSupabaseServerEnv()) return [];
  if (screenshotIds.length === 0) return [];
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("parsed_screenshot_results")
    .select(
      "id, screenshot_id, gp_name, detected_account_name, detected_team_names, detected_scores, screenshot_type, parsed_entities, confidence_by_field, missing_fields, warnings, approved"
    )
    .in("screenshot_id", screenshotIds)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    screenshotId: row.screenshot_id,
    gpName: row.gp_name ?? undefined,
    detectedAccountName: row.detected_account_name ?? undefined,
    detectedTeamNames: asArray<string>(row.detected_team_names),
    detectedScores: asArray<number>(row.detected_scores),
    screenshotType: row.screenshot_type ?? undefined,
    parsedEntities: (row.parsed_entities ?? {}) as Record<string, string | number | null>,
    confidenceByField: (row.confidence_by_field ?? {}) as Record<string, number>,
    missingFields: asArray<string>(row.missing_fields),
    warnings: asArray<string>(row.warnings),
    approved: row.approved
  }));
}

export async function getCorrectionLogs(gpId: string): Promise<CorrectionLog[]> {
  if (!hasSupabaseServerEnv()) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("correction_logs")
    .select("id, gp_id, screenshot_id, field_name, original_value, corrected_value, edited_by, edited_at, reason")
    .eq("gp_id", gpId)
    .order("edited_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    gpId: row.gp_id,
    screenshotId: row.screenshot_id ?? undefined,
    fieldName: row.field_name,
    originalValue: row.original_value ?? "",
    correctedValue: row.corrected_value ?? "",
    editedBy: row.edited_by,
    editedAt: row.edited_at,
    reason: row.reason ?? undefined
  }));
}

export async function getGpEntries(gpId: string, players: Player[], scores: GpTeamScore[]): Promise<GpEntry[]> {
  const data = hasSupabaseServerEnv()
    ? (
        await getSupabaseServerClient()
          .from("gp_entries")
          .select("id, gp_id, player_id, submission_status, notes")
          .eq("gp_id", gpId)
      ).data
    : null;

  if (data && data.length > 0) {
    return data.map((entry) => ({
      id: entry.id,
      gpId: entry.gp_id,
      playerId: entry.player_id,
      status: entry.submission_status,
      notes: entry.notes ?? undefined
    }));
  }

  return players
    .filter((player) => player.isActive)
    .map((player) => {
      const team1 = scores.find((s) => s.gpId === gpId && s.playerId === player.id && s.teamSlot === 1)?.score ?? null;
      const team2 = scores.find((s) => s.gpId === gpId && s.playerId === player.id && s.teamSlot === 2)?.score ?? null;
      const needsReview = team1 === null || team2 === null;
      return {
        id: `${gpId}_${player.id}`,
        gpId,
        playerId: player.id,
        status: deriveSubmissionStatus(team1, team2, needsReview),
        notes: needsReview ? "Incomplete team score data" : undefined
      } as GpEntry;
    });
}

export async function getGpOverview(gpId: string) {
  const [players, gps, allScores, settings, screenshots] = await Promise.all([
    getPlayers(),
    getGps(),
    getGpTeamScores(gpId),
    getLeagueSettings(),
    getScreenshotUploads(gpId)
  ]);

  const gp = gps.find((g) => g.id === gpId);
  if (!gp) return null;

  const [parsed, corrections, entries] = await Promise.all([
    getParsedResultsByScreenshotIds(screenshots.map((s) => s.id)),
    getCorrectionLogs(gpId),
    getGpEntries(gpId, players, allScores)
  ]);

  const parsedIds = parsed.map((row) => row.id);
  const autoAssignedByParsedId = new Map<
    string,
    { playerId: string; playerName?: string; team1Score: number | null; team2Score: number | null }
  >();

  if (hasSupabaseServerEnv() && parsedIds.length > 0) {
    const supabase = getSupabaseServerClient();
    const { data: autoRows } = await supabase
      .from("gp_team_scores")
      .select("source_parsed_result_id, player_id, team_slot, score")
      .in("source_parsed_result_id", parsedIds);

    for (const row of autoRows ?? []) {
      if (!row.source_parsed_result_id) continue;
      const existing = autoAssignedByParsedId.get(row.source_parsed_result_id) ?? {
        playerId: row.player_id,
        playerName: players.find((p) => p.id === row.player_id)?.displayName,
        team1Score: null,
        team2Score: null
      };

      if (row.team_slot === 1) existing.team1Score = row.score === null ? null : Number(row.score);
      if (row.team_slot === 2) existing.team2Score = row.score === null ? null : Number(row.score);
      autoAssignedByParsedId.set(row.source_parsed_result_id, existing);
    }
  }

  const rows = buildGpRows(gpId, players, allScores);
  const punishment = computePunishmentForGp(gpId, players, allScores, settings.tieRule);

  const screenshotPreviewUrls: Record<string, string> = {};
  if (hasSupabaseServerEnv() && screenshots.length > 0) {
    const supabase = getSupabaseServerClient();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "screenshots";
    const signed = await Promise.all(
      screenshots.map(async (shot) => {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(shot.storagePath, 60 * 60);
        return [shot.id, data?.signedUrl ?? ""] as const;
      })
    );

    for (const [id, url] of signed) {
      if (url) screenshotPreviewUrls[id] = url;
    }
  }

  return {
    gp,
    rows,
    punishment,
    entries,
    screenshots,
    screenshotPreviewUrls,
    parsed,
    autoAssignedByParsedId,
    corrections,
    players
  };
}

export async function computePunishmentBoard() {
  const [players, gps, scores, settings] = await Promise.all([
    getPlayers(),
    getGps(),
    getGpTeamScores(),
    getLeagueSettings()
  ]);

  const finalized = gps.filter((gp) => gp.status === "finalized");
  const lossCount = new Map<string, number>();
  const secondCount = new Map<string, number>();

  for (const gp of finalized) {
    const result = computePunishmentForGp(gp.id, players, scores, settings.tieRule);
    for (const id of result.loserPlayerIds) {
      lossCount.set(id, (lossCount.get(id) ?? 0) + 1);
    }
    for (const id of result.secondLastPlayerIds) {
      secondCount.set(id, (secondCount.get(id) ?? 0) + 1);
    }
  }

  return players.map((player) => ({
    playerId: player.id,
    playerName: player.displayName,
    losses: lossCount.get(player.id) ?? 0,
    secondLasts: secondCount.get(player.id) ?? 0
  }));
}
