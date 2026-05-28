import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "min-h-10 w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-soft outline-none transition focus:border-cyan",
        className
      )}
      {...props}
    />
  );
}
