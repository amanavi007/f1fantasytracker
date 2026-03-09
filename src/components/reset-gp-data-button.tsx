"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ResetGpDataButtonProps {
  gpId: string;
  label?: string;
  size?: "sm" | "default" | "lg";
}

export function ResetGpDataButton({ gpId, label = "Reset GP Data", size = "default" }: ResetGpDataButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onReset() {
    const confirmed = window.confirm(
      "Reset all uploaded/parsing/scoring data for this GP? This is for debugging and cannot be undone."
    );
    if (!confirmed) return;

    setLoading(true);
    setMessage(null);

    const response = await fetch(`/api/gps/${gpId}/reset`, {
      method: "POST"
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setMessage(payload.error || "Failed to reset GP data.");
      setLoading(false);
      return;
    }

    setMessage("GP data reset.");
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={onReset}
        disabled={loading}
        className="border-red-500/50 text-red-300 hover:bg-red-500/10"
      >
        {loading ? "Resetting..." : label}
      </Button>
      {message ? <p className="text-xs text-mutedForeground">{message}</p> : null}
    </div>
  );
}
