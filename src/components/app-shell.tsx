import { ReactNode } from "react";
import { SideNav } from "@/components/nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-telemetry bg-telemetry">
      <div className="mx-auto flex max-w-[1600px]">
        <SideNav />
        <main className="w-full px-4 py-6 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
