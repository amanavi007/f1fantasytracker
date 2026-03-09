"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminFetch } from "@/lib/admin-client";
import { useAdminUnlocked } from "@/hooks/use-admin-unlocked";

export function PlayerCreateForm() {
  const unlocked = useAdminUnlocked();
  const [displayName, setDisplayName] = useState("");
  const [realName, setRealName] = useState("");
  const [team1Name, setTeam1Name] = useState("");
  const [team2Name, setTeam2Name] = useState("");
  const [aliases, setAliases] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const response = await adminFetch("/api/players", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        displayName,
        realName: realName || null,
        team1Name,
        team2Name,
        aliases: aliases
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        notes: notes || null
      })
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error || "Failed to save player.");
      setSaving(false);
      return;
    }

    setMessage("Player saved. Refreshing...");
    window.location.reload();
  }

  if (!unlocked) {
    return <p className="text-sm text-mutedForeground">Admin unlock required to add or edit players.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Display name / nickname" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <Input placeholder="Real name (optional)" value={realName} onChange={(e) => setRealName(e.target.value)} />
        <Input placeholder="Team 1 name" value={team1Name} onChange={(e) => setTeam1Name(e.target.value)} required />
        <Input placeholder="Team 2 name" value={team2Name} onChange={(e) => setTeam2Name(e.target.value)} required />
        <Input
          placeholder="Alias list (comma separated)"
          className="md:col-span-2"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
        />
        <Textarea placeholder="Notes" className="md:col-span-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Player"}
        </Button>
        {message ? <p className="text-sm text-mutedForeground">{message}</p> : null}
      </div>
    </form>
  );
}
