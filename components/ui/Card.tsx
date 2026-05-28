import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-slate-800 bg-card p-5 shadow-sm", className)} {...props}>
      {children}
    </div>
  );
}
