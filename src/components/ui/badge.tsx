import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide", {
  variants: {
    variant: {
      neutral: "bg-white/10 text-white/80",
      success: "bg-emerald-500/20 text-emerald-300",
      warning: "bg-amber-500/20 text-amber-300",
      danger: "bg-red-500/20 text-red-300",
      accent: "bg-accent/20 text-accent"
    }
  },
  defaultVariants: {
    variant: "neutral"
  }
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
