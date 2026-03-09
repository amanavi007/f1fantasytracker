"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FinalizeGpButton({ gpId, isFinalized }: { gpId: string; isFinalized: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/gps/${gpId}/finalize`, {
      method: "POST"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setMessage(payload.error || "Failed to finalize GP.");
      setLoading(false);
      return;
    }

    setMessage(isFinalized ? "GP refreshed." : "GP finalized and locked.");
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={onClick} disabled={loading}>
        {loading ? "Processing..." : isFinalized ? "Re-run Finalization" : "Finalize GP"}
      </Button>
      {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
    </div>
  );
}
