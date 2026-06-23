"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, HardDrive, Images, LayoutDashboard, Monitor, Settings, Tv } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/dashboard/screens", label: t("nav.screens"), icon: Monitor },
    { href: "/dashboard/devices", label: t("nav.devices"), icon: HardDrive },
    { href: "/dashboard/media", label: t("nav.media"), icon: Images },
    { href: "/dashboard/playlists", label: t("nav.playlists"), icon: Tv },
    { href: "/dashboard/schedules", label: t("nav.schedules"), icon: CalendarClock },
    { href: "/dashboard/settings", label: t("nav.settings"), icon: Settings }
  ];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-surface p-5 lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-lg font-bold">K</span>
        <div>
          <p className="font-semibold">{t("nav.brand")}</p>
          <p className="text-xs text-slate-400">{t("nav.tagline")}</p>
        </div>
      </Link>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white",
                active && "bg-brand text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
