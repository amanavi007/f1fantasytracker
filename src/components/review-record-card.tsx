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

interface EditableLeaderboardRow {
  rank: string;
  team_name: string;
  owner_name: string;
  score: string;
  team_slot_hint: "T1" | "T2" | "";
}

function toEditableRows(parsed: ParsedScreenshotResult): EditableLeaderboardRow[] {
  const rows = Array.isArray(parsed.parsedEntities.leaderboard_rows)
    ? parsed.parsedEntities.leaderboard_rows.filter(
        (row): row is Record<string, unknown> => Boolean(row) && typeof row === "object"
      )
    : [];

  return rows.map((row) => ({
    rank: row.rank === null || row.rank === undefined ? "" : String(row.rank),
    team_name: typeof row.team_name === "string" ? row.team_name : "",
    owner_name: typeof row.owner_name === "string" ? row.owner_name : "",
    score: row.score === null || row.score === undefined ? "" : String(row.score),
    team_slot_hint: row.team_slot_hint === "T1" || row.team_slot_hint === "T2" ? row.team_slot_hint : ""
  }));
}

function parseNullableNumber(value: string) {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function ReviewRecordCard({ parsed, screenshot, screenshotPreviewUrl, players, autoAssigned }: Props) {
  const [rows, setRows] = useState<EditableLeaderboardRow[]>(toEditableRows(parsed));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const parsedRows = useMemo(() => {
    return rows.map((row, index) => {
      const teamName = row.team_name;
      const ownerName = row.owner_name;
      const rank = parseNullableNumber(row.rank);
      const score = parseNullableNumber(row.score);
      const slotHint = row.team_slot_hint || null;

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
  }, [rows, players, parsed.id]);

  function updateRow(index: number, key: keyof EditableLeaderboardRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { rank: "", team_name: "", owner_name: "", score: "", team_slot_hint: "" }]);
  }

  async function patchParsedResult(approved: boolean) {
    setSaving(true);
    setMessage(null);

    const parsedLeaderboardRows = rows.map((row) => ({
      rank: parseNullableNumber(row.rank),
      team_name: row.team_name.trim() || null,
      owner_name: row.owner_name.trim() || null,
      score: parseNullableNumber(row.score),
      team_slot_hint: row.team_slot_hint || null
    }));

    const response = await fetch(`/api/parsed-results/${parsed.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parsedLeaderboardRows,
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
        <CardDescription className="mt-1">Review leaderboard rows, edit if needed, then submit.</CardDescription>

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

        {autoAssigned ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-300">
            Auto-assigned in DB: {autoAssigned.playerName ?? autoAssigned.playerId} | T1 {autoAssigned.team1Score ?? "-"} | T2 {autoAssigned.team2Score ?? "-"}
          </div>
        ) : null}

        <div className="rounded-md border border-border/70 bg-black/20 p-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mutedForeground">Parsed Leaderboard Rows</p>
          {parsedRows.length === 0 ? (
            <p className="mt-2 text-xs text-amber-300">No leaderboard rows were extracted from this screenshot.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-md border border-border/60">
              <table className="min-w-[700px] w-full text-xs">
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
                  {parsedRows.map((row, index) => (
                    <tr key={row.id} className="border-t border-border/40">
                      <td className="px-2 py-1">
                        <Input
                          value={rows[index]?.rank ?? ""}
                          onChange={(e) => updateRow(index, "rank", e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={rows[index]?.team_name ?? ""}
                          onChange={(e) => updateRow(index, "team_name", e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={rows[index]?.owner_name ?? ""}
                          onChange={(e) => updateRow(index, "owner_name", e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={rows[index]?.score ?? ""}
                          onChange={(e) => updateRow(index, "score", e.target.value)}
                          className="h-8"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          value={rows[index]?.team_slot_hint ?? ""}
                          onChange={(e) => updateRow(index, "team_slot_hint", e.target.value as "T1" | "T2" | "")}
                          className="h-8 rounded-md border border-border/70 bg-background px-2 text-xs"
                        >
                          <option value="">-</option>
                          <option value="T1">T1</option>
                          <option value="T2">T2</option>
                        </select>
                      </td>
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
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={addRow} disabled={saving}>
              Add Row
            </Button>
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
