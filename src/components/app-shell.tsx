import { ReactNode } from "react";
import { MobileNav, SideNav } from "@/components/nav";

export async function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-telemetry bg-telemetry">
      <MobileNav />
      <div className="mx-auto flex max-w-[1600px]">
        <SideNav />
        <main className="w-full px-4 py-6 pb-24 sm:px-6 lg:px-10 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}
