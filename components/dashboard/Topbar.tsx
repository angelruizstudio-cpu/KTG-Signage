"use client";

import Link from "next/link";
import { HardDrive, LogOut, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Organization } from "@/types/signage";

export function Topbar({ organization }: { organization?: Organization | null }) {
  const { t } = useLanguage();

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-deep/90 px-4 py-3 lg:px-8">
      <div>
        <p className="text-sm text-slate-400">{t("topbar.organization")}</p>
        <h1 className="text-lg font-semibold">{organization?.name ?? t("topbar.noOrganization")}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageSwitcher />
        <Link href="/dashboard/media/upload">
          <Button variant="secondary">
            <Upload className="h-4 w-4" />
            {t("topbar.upload")}
          </Button>
        </Link>
        <Link href="/dashboard/screens/new">
          <Button>
            <Plus className="h-4 w-4" />
            {t("topbar.screen")}
          </Button>
        </Link>
        <Link href="/dashboard/devices">
          <Button variant="secondary">
            <HardDrive className="h-4 w-4" />
            {t("topbar.pairTv")}
          </Button>
        </Link>
        <Link href="/logout">
          <Button variant="ghost">
            <LogOut className="h-4 w-4" />
            {t("topbar.logout")}
          </Button>
        </Link>
      </div>
    </header>
  );
}
