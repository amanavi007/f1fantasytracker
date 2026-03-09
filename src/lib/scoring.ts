import { GpComputedRow, GpPunishmentResult, GpTeamScore, Player, TieRule } from "@/lib/types";

function compareNullableAsc(a: number | null, b: number | null) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

export function buildGpRows(gpId: string, players: Player[], scores: GpTeamScore[]): GpComputedRow[] {
  const rows: GpComputedRow[] = players
    .filter((player) => player.isActive)
    .map((player) => {
      const team1 = scores.find((s) => s.gpId === gpId && s.playerId === player.id && s.teamSlot === 1);
      const team2 = scores.find((s) => s.gpId === gpId && s.playerId === player.id && s.teamSlot === 2);
      const combined = team1?.score !== null && team1?.score !== undefined && team2?.score !== null && team2?.score !== undefined
        ? team1.score + team2.score
        : null;

      return {
        gpId,
        playerId: player.id,
        playerName: player.displayName,
        team1Score: team1?.score ?? null,
        team2Score: team2?.score ?? null,
        combined,
        rank: null
      };
    })
    .sort((a, b) => compareNullableAsc(a.combined, b.combined));

  let rank = 1;
  for (let i = 0; i < rows.length; i += 1) {
    if (i > 0 && rows[i].combined !== rows[i - 1].combined) {
      rank = i + 1;
    }
    rows[i].rank = rows[i].combined === null ? null : rank;
  }

  return rows;
}

export function computePunishmentForGp(
  gpId: string,
  players: Player[],
  scores: GpTeamScore[],
  tieRule: TieRule = "lower_best_team_loses"
): GpPunishmentResult {
  const rows = buildGpRows(gpId, players, scores).filter((r) => r.combined !== null);
  if (rows.length === 0) {
    return {
      gpId,
      loserPlayerIds: [],
      secondLastPlayerIds: [],
      tieRule,
      requiresManualDecision: false
    };
  }

  const lowest = rows[0].combined as number;
  const tiedLowest = rows.filter((r) => r.combined === lowest);

  let losers = tiedLowest;
  let requiresManualDecision = false;

  if (tiedLowest.length > 1 && tieRule === "lower_best_team_loses") {
    const sortedByBestTeam = tiedLowest
      .map((r) => ({
        ...r,
        bestTeam: Math.max(r.team1Score ?? -99999, r.team2Score ?? -99999)
      }))
      .sort((a, b) => a.bestTeam - b.bestTeam);

    const candidate = sortedByBestTeam[0];
    const sameBest = sortedByBestTeam.filter((r) => r.bestTeam === candidate.bestTeam);
    losers = sameBest.length > 1 ? sameBest : [candidate];
    requiresManualDecision = sameBest.length > 1;
  }

  if (tiedLowest.length > 1 && tieRule === "manual_decision") {
    requiresManualDecision = true;
  }

  const nonLosers = rows.filter((r) => !losers.some((l) => l.playerId === r.playerId));
  const secondLastScore = nonLosers[0]?.combined ?? null;
  const secondLast = secondLastScore === null ? [] : nonLosers.filter((r) => r.combined === secondLastScore);

  return {
    gpId,
    loserPlayerIds: losers.map((l) => l.playerId),
    secondLastPlayerIds: secondLast.map((s) => s.playerId),
    tieRule,
    requiresManualDecision
  };
}

export function deriveSubmissionStatus(team1: number | null, team2: number | null, needsReview: boolean) {
  if (team1 === null && team2 === null) return "missing_submission";
  if (needsReview) return "needs_review";
  if (team1 === null || team2 === null) return "one_team_missing";
  return "both_detected";
}
