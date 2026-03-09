"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, Gauge, ScanSearch, ShieldAlert, Users } from "lucide-react";
import { AdminUnlock } from "@/components/admin-unlock";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/gps", label: "GP History", icon: Flag },
  { href: "/upload", label: "Batch Upload", icon: ScanSearch },
  { href: "/players", label: "Players", icon: Users },
  { href: "/punishments", label: "Punishment Board", icon: ShieldAlert }
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-border/80 bg-black/30 p-6 backdrop-blur-xl lg:block">
      <div className="mb-8">
        <p className="font-display text-xl tracking-[0.2em] text-white">F1 PUNISHMENT</p>
        <p className="text-xs uppercase tracking-[0.16em] text-mutedForeground">Fantasy League Ops</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-accent/15 text-white" : "text-mutedForeground hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-6">
        <AdminUnlock />
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const bottomItems = navItems.slice(0, 5);

  return (
    <>
      <div className="sticky top-0 z-30 border-b border-border/70 bg-black/40 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-sm tracking-[0.2em] text-white">F1 PUNISHMENT</p>
          <AdminUnlock />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
                  active
                    ? "border-accent/50 bg-accent/20 text-white"
                    : "border-border/70 bg-black/20 text-mutedForeground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-border/70 bg-black/80 backdrop-blur lg:hidden">
        {bottomItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-[10px]",
                active ? "text-accent" : "text-mutedForeground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label.replace("Batch ", "")}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
