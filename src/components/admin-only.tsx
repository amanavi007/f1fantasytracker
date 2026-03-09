"use client";

import { ReactNode } from "react";
import { useAdminUnlocked } from "@/hooks/use-admin-unlocked";

export function AdminOnly({ children }: { children: ReactNode }) {
  const unlocked = useAdminUnlocked();
  if (!unlocked) return null;
  return <>{children}</>;
}
