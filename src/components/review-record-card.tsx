"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ConfidenceChip } from "@/components/confidence-chip";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ParsedScreenshotResult, Player, ScreenshotUpload } from "@/lib/types";

interface Props {
  parsed: ParsedScreenshotResult;
  screenshot?: ScreenshotUpload;
  screenshotPreviewUrl?: string;
  players: Player[];
  autoAssigned?: {
    playerId: string;
    playerName?: string;
    team1Score: number | null;
    team2Score: number | null;
  };
}

export function ReviewRecordCard({ parsed, screenshot, screenshotPreviewUrl, players, autoAssigned }: Props) {
  const fallbackTeam1 =
    parsed.parsedEntities.team_1_score ??
    (Number.isFinite(parsed.detectedScores[0]) ? parsed.detectedScores[0] : null) ??
    autoAssigned?.team1Score ??
    "";
  const fallbackTeam2 =
    parsed.parsedEntities.team_2_score ??
    (Number.isFinite(parsed.detectedScores[1]) ? parsed.detectedScores[1] : null) ??
    autoAssigned?.team2Score ??
    "";

  const [account, setAccount] = useState(parsed.detectedAccountName ?? "");
  const [team1Score, setTeam1Score] = useState(String(fallbackTeam1));
  const [team2Score, setTeam2Score] = useState(String(fallbackTeam2));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const matchedPlayer = useMemo(() => {
    const lower = account.toLowerCase();
    return players.find((p) => p.aliases.some((a) => a.toLowerCase() === lower));
  }, [account, players]);

  const parsedRows = useMemo(() => {
    const rows = Array.isArray(parsed.parsedEntities.leaderboard_rows)
      ? parsed.parsedEntities.leaderboard_rows.filter(
          (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
        )
      : [];

    return rows.map((row, index) => {
      const teamName = typeof row.team_name === "string" ? row.team_name : "";
      const ownerName = typeof row.owner_name === "string" ? row.owner_name : "";
      const rank = Number.isFinite(Number(row.rank)) ? Number(row.rank) : null;
      const score = Number.isFinite(Number(row.score)) ? Number(row.score) : null;
      const slotHint = typeof row.team_slot_hint === "string" ? row.team_slot_hint : null;

      const lowerTeam = teamName.trim().toLowerCase();
      const lowerOwner = ownerName.trim().toLowerCase();
      const matchedByTeam = players.find(
        (player) =>
          player.team1Name.trim().toLowerCase() === lowerTeam || player.team2Name.trim().toLowerCase() === lowerTeam
      );
      const matchedByOwner = players.find(
        (player) =>
          player.displayName.trim().toLowerCase() === lowerOwner ||
          player.aliases.some((alias) => alias.trim().toLowerCase() === lowerOwner)
      );

      const mappedPlayer = matchedByTeam ?? matchedByOwner;

      return {
        id: `${parsed.id}_row_${index}`,
        rank,
        teamName,
        ownerName,
        score,
        slotHint,
        mappedPlayerName: mappedPlayer?.displayName ?? null
      };
    });
  }, [parsed.id, parsed.parsedEntities.leaderboard_rows, players]);

  async function patchParsedResult(approved: boolean) {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/parsed-results/${parsed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        detectedAccountName: account,
        team1Score: team1Score ? Number(team1Score) : null,
        team2Score: team2Score ? Number(team2Score) : null,
        approved,
        reason
      })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "Failed to save changes.");
      setSaving(false);
      return;
    }

    setMessage(approved ? "Approved and saved." : "Correction saved.");
    window.location.reload();
  }

  return (
    <Card className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <CardTitle className="font-display text-xl">{screenshot?.fileName ?? "Screenshot"}</CardTitle>
        <CardDescription className="mt-1">Review extraction, map alias, and approve record.</CardDescription>

        <div className="mt-4 h-72 rounded-lg border border-border bg-gradient-to-br from-neutral-900 to-neutral-800 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-mutedForeground">Original Screenshot</p>
          {screenshotPreviewUrl ? (
            <div className="relative mt-3 h-[240px] overflow-hidden rounded-md border border-border/60">
              <img
                src={screenshotPreviewUrl}
                alt={screenshot?.fileName ?? "Screenshot preview"}
                className="h-full w-full object-contain"
              />
            </div>
          ) : (
            <p className="mt-6 text-sm text-mutedForeground">Screenshot preview unavailable.</p>
          )}
        </div>

        {parsed.warnings.length > 0 ? (
          <div className="mt-4 rounded-lg border border-red-500/35 bg-red-500/10 p-3 text-sm text-red-200">
            <div className="mb-2 flex items-center gap-2 text-red-300">
              <AlertTriangle className="h-4 w-4" />
              Parsing warnings
            </div>
            <ul className="space-y-1">
              {parsed.warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-mutedForeground">Field Confidence</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(parsed.confidenceByField).map(([key, value]) => (
              <div key={key} className="rounded-md border border-border/70 px-2 py-1 text-xs">
                <span className="mr-2 text-mutedForeground">{key}</span>
                <ConfidenceChip value={value} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs uppercase tracking-[0.16em] text-mutedForeground">Detected Account / Alias</label>
          <Input value={account} onChange={(e) => setAccount(e.target.value)} />
          <p className="text-xs text-mutedForeground">
            {matchedPlayer ? `Mapped to ${matchedPlayer.displayName}` : "No alias match. Map manually in players settings."}
          </p>
          {autoAssigned ? (
            <p className="text-xs text-emerald-300">
              Auto-assigned in DB: {autoAssigned.playerName ?? autoAssigned.playerId} | T1 {autoAssigned.team1Score ?? "-"} | T2 {autoAssigned.team2Score ?? "-"}
            </p>
          ) : (
            <p className="text-xs text-amber-300">No auto-assigned DB scores for this parse record yet.</p>
          )}
        </div>

        <div className="rounded-md border border-border/70 bg-black/20 p-3 text-xs text-mutedForeground">
          <p className="uppercase tracking-[0.14em]">Extracted Snapshot</p>
          <p className="mt-2">Detected team names: {parsed.detectedTeamNames.join(", ") || "None"}</p>
          <p>Detected scores: {parsed.detectedScores.length ? parsed.detectedScores.join(", ") : "None"}</p>
        </div>

        <div className="rounded-md border border-border/70 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mutedForeground">Parsed Leaderboard Rows</p>
          {parsedRows.length === 0 ? (
            <p className="mt-2 text-xs text-amber-300">No leaderboard rows were extracted from this screenshot.</p>
          ) : (
            <div className="mt-3 overflow-hidden rounded-md border border-border/60">
              <table className="w-full text-xs">
                <thead className="bg-neutral-900/70 text-mutedForeground">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium">Rank</th>
                    <th className="px-2 py-1 text-left font-medium">Team</th>
                    <th className="px-2 py-1 text-left font-medium">Owner</th>
                    <th className="px-2 py-1 text-left font-medium">Score</th>
                    <th className="px-2 py-1 text-left font-medium">Slot</th>
                    <th className="px-2 py-1 text-left font-medium">Map</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr key={row.id} className="border-t border-border/40">
                      <td className="px-2 py-1">{row.rank ?? "-"}</td>
                      <td className="px-2 py-1">{row.teamName || "-"}</td>
                      <td className="px-2 py-1">{row.ownerName || "-"}</td>
                      <td className="px-2 py-1">{row.score ?? "-"}</td>
                      <td className="px-2 py-1">{row.slotHint ?? "-"}</td>
                      <td className="px-2 py-1">
                        {row.mappedPlayerName ? (
                          <span className="text-emerald-300">Mapped: {row.mappedPlayerName}</span>
                        ) : (
                          <span className="text-amber-300">Unmapped</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-mutedForeground">Team 1 GP Score</label>
            <Input value={team1Score} onChange={(e) => setTeam1Score(e.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.16em] text-mutedForeground">Team 2 GP Score</label>
            <Input
              value={team2Score}
              onChange={(e) => setTeam2Score(e.target.value)}
              className={parsed.missingFields.includes("team_2_score") ? "border-amber-400/70" : ""}
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.16em] text-mutedForeground">Correction Reason</label>
          <Textarea
            placeholder="Optional note for audit log"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="subtle" disabled={saving} onClick={() => patchParsedResult(false)}>
            {saving ? "Saving..." : "Save Correction"}
          </Button>
          <Button disabled={saving} onClick={() => patchParsedResult(true)}>
            {saving ? "Saving..." : "Approve Record"}
          </Button>
        </div>
        {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
      </div>
    </Card>
  );
}
