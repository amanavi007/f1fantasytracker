import { ReactNode } from "react";
import { MobileNav, SideNav } from "@/components/nav";
import { RaceControlFab } from "@/components/race-control-fab";
import { getGps } from "@/lib/data";

export async function AppShell({ children }: { children: ReactNode }) {
  const gps = await getGps();
  const activeGp = gps.find((gp) => gp.status !== "finalized") ?? gps[0];

  return (
    <div className="min-h-screen bg-background bg-telemetry bg-telemetry">
      <MobileNav />
      <div className="mx-auto flex max-w-[1600px]">
        <SideNav />
        <main className="w-full px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:pb-6">{children}</main>
      </div>
      <RaceControlFab currentGpId={activeGp?.id} />
    </div>
  );
}
