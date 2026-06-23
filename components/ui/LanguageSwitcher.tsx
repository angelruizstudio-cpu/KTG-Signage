"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={cn("inline-flex rounded-md border border-slate-700 bg-surface p-0.5 text-xs font-medium", className)}>
      {(["en", "es"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setLang(option)}
          className={cn(
            "rounded-[5px] px-2.5 py-1 transition",
            lang === option ? "bg-brand text-white" : "text-slate-400 hover:text-white"
          )}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
