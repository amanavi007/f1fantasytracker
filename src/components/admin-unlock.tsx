"use client";

import { useState } from "react";
import { clearAdminApiKey, setAdminApiKey } from "@/lib/admin-client";
import { useAdminUnlocked } from "@/hooks/use-admin-unlocked";

export function AdminUnlock() {
  const unlocked = useAdminUnlocked();
  const [loading, setLoading] = useState(false);

  async function onToggle() {
    setLoading(true);

    if (unlocked) {
      await fetch("/api/admin/session", { method: "DELETE" });
      clearAdminApiKey();
      setLoading(false);
      return;
    }

    const entered = window.prompt("Enter admin key to unlock editing");
    if (!entered) {
      setLoading(false);
      return;
    }

    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: entered })
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      window.alert(payload.error || "Admin unlock failed.");
      setLoading(false);
      return;
    }

    setAdminApiKey(entered);
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={loading}
      className={unlocked ? "rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300" : "rounded-md border border-border/70 bg-black/20 px-2 py-1 text-xs text-mutedForeground"}
      title={unlocked ? "Admin editing unlocked in this browser" : "Unlock admin editing"}
    >
      {loading ? "Working..." : unlocked ? "Admin Unlocked" : "Unlock Admin"}
    </button>
  );
}
