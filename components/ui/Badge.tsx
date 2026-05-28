import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Badge({
  className,
  tone = "neutral",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "danger" | "warning" | "info"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-slate-800 text-slate-300",
        tone === "success" && "bg-online/15 text-online",
        tone === "danger" && "bg-offline/15 text-offline",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "info" && "bg-cyan/15 text-cyan",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
