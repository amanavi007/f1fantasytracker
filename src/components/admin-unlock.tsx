"use client";

import { clearAdminApiKey, setAdminApiKey } from "@/lib/admin-client";
import { useAdminUnlocked } from "@/hooks/use-admin-unlocked";

export function AdminUnlock() {
  const unlocked = useAdminUnlocked();

  function onToggle() {
    if (unlocked) {
      clearAdminApiKey();
      return;
    }

    const entered = window.prompt("Enter admin key to unlock editing");
    if (!entered) return;
    setAdminApiKey(entered);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={unlocked ? "rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300" : "rounded-md border border-border/70 bg-black/20 px-2 py-1 text-xs text-mutedForeground"}
      title={unlocked ? "Admin editing unlocked in this browser" : "Unlock admin editing"}
    >
      {unlocked ? "Admin Unlocked" : "Unlock Admin"}
    </button>
  );
}
