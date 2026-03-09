import { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({ title, value, subText, icon }: { title: string; value: string; subText?: string; icon?: ReactNode }) {
  return (
    <Card className="animate-fade-slide">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-mutedForeground">{title}</p>
          <p className="mt-2 font-display text-3xl tracking-wider text-white">{value}</p>
          {subText ? <p className="mt-2 text-sm text-mutedForeground">{subText}</p> : null}
        </div>
        {icon ? <div className="text-accent">{icon}</div> : null}
      </div>
    </Card>
  );
}
