"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ManualScoreForm({ gpId, playerId }: { gpId: string; playerId: string }) {
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setMessage(null);

    const response = await fetch(`/api/gps/${gpId}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId,
        team1Score: team1Score ? Number(team1Score) : null,
        team2Score: team2Score ? Number(team2Score) : null
      })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "Failed to save scores.");
      setSaving(false);
      return;
    }

    setMessage("Saved. Refreshing...");
    window.location.reload();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Input
        className="w-28"
        placeholder="T1"
        value={team1Score}
        onChange={(e) => setTeam1Score(e.target.value)}
        inputMode="numeric"
      />
      <Input
        className="w-28"
        placeholder="T2"
        value={team2Score}
        onChange={(e) => setTeam2Score(e.target.value)}
        inputMode="numeric"
      />
      <Button variant="subtle" size="sm" disabled={saving} onClick={onSave} type="button">
        {saving ? "Saving" : "Save Scores"}
      </Button>
      {message ? <span className="text-xs text-mutedForeground">{message}</span> : null}
    </div>
  );
}
