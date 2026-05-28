"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, HardDrive, Images, LayoutDashboard, Monitor, Settings, Tv } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/screens", label: "Screens", icon: Monitor },
  { href: "/dashboard/devices", label: "Devices", icon: HardDrive },
  { href: "/dashboard/media", label: "Media Library", icon: Images },
  { href: "/dashboard/playlists", label: "Playlists", icon: Tv },
  { href: "/dashboard/schedules", label: "Schedules", icon: CalendarClock },
  { href: "/dashboard/settings", label: "Settings", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-surface p-5 lg:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-brand text-lg font-bold">K</span>
        <div>
          <p className="font-semibold">KTG Signage</p>
          <p className="text-xs text-slate-400">Realtime displays</p>
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
