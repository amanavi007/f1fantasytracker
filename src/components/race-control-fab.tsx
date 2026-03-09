"use client";

import Link from "next/link";
import { useState } from "react";
import { Flag, ScanSearch, TimerReset, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface RaceControlFabProps {
  currentGpId?: string;
}

export function RaceControlFab({ currentGpId }: RaceControlFabProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      href: "/upload",
      label: "Batch Upload",
      icon: ScanSearch
    },
    {
      href: currentGpId ? `/gps/${currentGpId}` : "/gps",
      label: "Current GP",
      icon: Flag
    },
    {
      href: currentGpId ? `/gps/${currentGpId}/review` : "/gps",
      label: "Review Queue",
      icon: TimerReset
    }
  ];

  return (
    <div className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6">
      <div
        className={cn(
          "mb-3 flex flex-col items-end gap-2 transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
        )}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-black/80 px-3 py-2 text-xs text-white shadow-race backdrop-blur"
              onClick={() => setOpen(false)}
            >
              <Icon className="h-3.5 w-3.5 text-accent" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 bg-accent text-white shadow-glow transition hover:brightness-110"
        aria-label="Open race control actions"
      >
        {open ? <X className="h-5 w-5" /> : <ScanSearch className="h-5 w-5" />}
      </button>
    </div>
  );
}
