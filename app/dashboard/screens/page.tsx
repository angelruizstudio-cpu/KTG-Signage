"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ScreenStatusCard } from "@/components/screens/ScreenStatusCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { listScreens } from "@/lib/services/screens";
import type { Screen } from "@/types/signage";

export default function ScreensPage() {
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = useMemo(() => createClient(), []);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    setLoading(true);
    setLoadError(null);
    listScreens(supabase, organization.id)
      .then(setScreens)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load screens."))
      .finally(() => setLoading(false));
  }, [organization, supabase]);

  if (loading) return <LoadingState label={t("screens.loading")} />;
  if (loadError) return <EmptyState title="Could not load screens" description={loadError} />;

  return (
    <>
      <PageHeader
        title={t("screens.title")}
        description={t("screens.description")}
        action={
          <Link href="/dashboard/screens/new">
            <Button>
              <Plus className="h-4 w-4" />
              {t("screens.new")}
            </Button>
          </Link>
        }
      />
      {screens.length === 0 ? (
        <EmptyState title={t("screens.emptyTitle")} description={t("screens.emptyDescription")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {screens.map((screen) => (
            <ScreenStatusCard key={screen.id} screen={screen} />
          ))}
        </div>
      )}
    </>
  );
}

