"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, Gauge, GalleryHorizontal, ScanSearch, ShieldAlert, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/gps", label: "GP History", icon: Flag },
  { href: "/upload", label: "Batch Upload", icon: ScanSearch },
  { href: "/players", label: "Players", icon: Users },
  { href: "/punishments", label: "Punishment Board", icon: ShieldAlert },
  { href: "/stats", label: "Shame Stats", icon: GalleryHorizontal }
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
    </aside>
  );
}
