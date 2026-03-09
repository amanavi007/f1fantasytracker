"use client";

import { useEffect, useState } from "react";
import { hasAdminApiKey, onAdminApiKeyChange } from "@/lib/admin-client";

export function useAdminUnlocked() {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    setUnlocked(hasAdminApiKey());
    return onAdminApiKeyChange(() => setUnlocked(hasAdminApiKey()));
  }, []);

  return unlocked;
}
