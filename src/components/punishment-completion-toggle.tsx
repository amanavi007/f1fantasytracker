"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin-client";
import { useAdminUnlocked } from "@/hooks/use-admin-unlocked";

interface Props {
  gpId: string;
  playerId: string;
  initialCompleted: boolean;
}

export function PunishmentCompletionToggle({ gpId, playerId, initialCompleted }: Props) {
  const unlocked = useAdminUnlocked();
  const router = useRouter();
  const [completed, setCompleted] = useState(initialCompleted);
  const [loading, setLoading] = useState(false);

  async function onToggle() {
    const next = !completed;
    setLoading(true);

    const response = await adminFetch("/api/punishments/completion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gpId, playerId, completed: next })
    });

    if (response.ok) {
      setCompleted(next);
      router.refresh();
    }

    setLoading(false);
  }

  if (!unlocked) {
    return <span className="text-xs text-mutedForeground">{completed ? "Done" : "Pending"}</span>;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={completed ? "subtle" : "outline"}
      disabled={loading}
      onClick={onToggle}
      className={completed ? "text-emerald-300" : "text-amber-300"}
    >
      {loading ? "Saving..." : completed ? "Punishment Done" : "Mark Done"}
    </Button>
  );
}
