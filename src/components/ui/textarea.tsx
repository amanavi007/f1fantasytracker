import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-black/20 px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent",
        className
      )}
      {...props}
    />
  );
}
