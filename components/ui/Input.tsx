import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-10 w-full rounded-md border border-slate-700 bg-surface px-3 py-2 text-sm text-soft outline-none transition placeholder:text-muted focus:border-cyan",
        className
      )}
      {...props}
    />
  );
}
