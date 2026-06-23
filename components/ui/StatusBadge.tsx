"use client";

import { Badge } from "./Badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { ScreenStatus } from "@/types/signage";

export function StatusBadge({ status }: { status: ScreenStatus }) {
  const { t } = useLanguage();
  if (status === "online") return <Badge tone="success">{t("statusBadge.online")}</Badge>;
  if (status === "maintenance") return <Badge tone="warning">{t("statusBadge.maintenance")}</Badge>;
  return <Badge tone="danger">{t("statusBadge.offline")}</Badge>;
}
