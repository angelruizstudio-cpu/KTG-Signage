"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { listPlaylists } from "@/lib/services/playlists";
import type { Playlist } from "@/types/signage";

export default function PlaylistsPage() {
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    listPlaylists(supabase, organization.id)
      .then(setPlaylists)
      .finally(() => setLoading(false));
  }, [organization, supabase]);

  if (loading) return <LoadingState label={t("playlists.loading")} />;

  return (
    <>
      <PageHeader
        title={t("playlists.title")}
        description={t("playlists.description")}
        action={
          <Link href="/dashboard/playlists/new">
            <Button>
              <Plus className="h-4 w-4" />
              {t("playlists.new")}
            </Button>
          </Link>
        }
      />
      {playlists.length === 0 ? (
        <EmptyState title={t("playlists.emptyTitle")} description={t("playlists.emptyDescription")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {playlists.map((playlist) => (
            <Link key={playlist.id} href={`/dashboard/playlists/${playlist.id}`}>
              <Card className="h-full hover:border-cyan">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{playlist.name}</h3>
                  <Badge tone={playlist.is_active ? "success" : "neutral"}>{playlist.is_active ? t("common.active") : t("common.inactive")}</Badge>
                </div>
                <p className="mt-3 text-sm text-slate-400">{playlist.description || t("common.noDescription")}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
