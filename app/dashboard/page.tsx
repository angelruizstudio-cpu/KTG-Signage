"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Images, Monitor, PlaySquare, Upload } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import type { DashboardStats, MediaAsset, Screen } from "@/types/signage";
import { formatDate } from "@/lib/utils/format";

export default function DashboardPage() {
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    async function load() {
      setLoading(true);
      const [screensResult, mediaResult, playlistsResult, schedulesResult] = await Promise.all([
        supabase.from("screens").select("*").eq("organization_id", organizationId),
        supabase.from("media_assets").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
        supabase.from("playlists").select("*").eq("organization_id", organizationId),
        supabase.from("schedules").select("*").eq("organization_id", organizationId).eq("is_active", true)
      ]);
      const allScreens = (screensResult.data ?? []) as Screen[];
      const recentMedia = (mediaResult.data ?? []) as MediaAsset[];
      setScreens(allScreens.slice(0, 5));
      setMedia(recentMedia.slice(0, 5));
      setStats({
        totalScreens: allScreens.length,
        onlineScreens: allScreens.filter((screen) => screen.status === "online").length,
        offlineScreens: allScreens.filter((screen) => screen.status === "offline").length,
        totalMediaAssets: recentMedia.length,
        totalPlaylists: playlistsResult.data?.length ?? 0,
        activeSchedules: schedulesResult.data?.length ?? 0
      });
      setLoading(false);
    }
    void load();
  }, [organization, supabase]);

  if (loading) return <LoadingState label={t("dashboardHome.loading")} />;
  if (error || !stats) return <EmptyState title="Could not load dashboard" description={error ?? "Try refreshing the page."} />;

  return (
    <>
      <PageHeader
        title={t("dashboardHome.title")}
        description={t("dashboardHome.description")}
        action={
          <Link href="/dashboard/media/upload">
            <Button>
              <Upload className="h-4 w-4" />
              {t("dashboardHome.uploadMedia")}
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          [t("dashboardHome.totalScreens"), stats.totalScreens],
          [t("dashboardHome.online"), stats.onlineScreens],
          [t("dashboardHome.offline"), stats.offlineScreens],
          [t("dashboardHome.mediaAssets"), stats.totalMediaAssets],
          [t("dashboardHome.playlists"), stats.totalPlaylists],
          [t("dashboardHome.activeSchedules"), stats.activeSchedules]
        ].map(([label, value]) => (
          <Card key={label}>
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("dashboardHome.recentActivity")}</h2>
          <div className="space-y-3">
            {screens.map((screen) => (
              <div key={screen.id} className="flex items-center justify-between gap-4 rounded-md bg-surface p-3">
                <div>
                  <p className="font-medium">{screen.name}</p>
                  <p className="text-xs text-slate-400">{formatDate(screen.last_seen_at)}</p>
                </div>
                <span className={screen.status === "online" ? "text-online" : "text-offline"}>{screen.status}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("dashboardHome.quickActions")}</h2>
          <div className="grid gap-3">
            <Link href="/dashboard/screens/new" className="rounded-md bg-surface p-4 hover:bg-white/5">
              <Monitor className="mb-2 h-5 w-5 text-cyan" />
              {t("dashboardHome.createScreen")} <ArrowRight className="float-right h-4 w-4" />
            </Link>
            <Link href="/dashboard/playlists/new" className="rounded-md bg-surface p-4 hover:bg-white/5">
              <PlaySquare className="mb-2 h-5 w-5 text-cyan" />
              {t("dashboardHome.createPlaylist")} <ArrowRight className="float-right h-4 w-4" />
            </Link>
            <Link href="/dashboard/media/upload" className="rounded-md bg-surface p-4 hover:bg-white/5">
              <Images className="mb-2 h-5 w-5 text-cyan" />
              {t("dashboardHome.uploadAnnouncementMedia")} <ArrowRight className="float-right h-4 w-4" />
            </Link>
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">{t("dashboardHome.recentlyUploaded")}</h2>
        <div className="grid gap-3 md:grid-cols-5">
          {media.map((asset) => (
            <div key={asset.id} className="overflow-hidden rounded-md bg-surface">
              <div className="aspect-video bg-black">
                {asset.media_type === "image" ? <img src={asset.file_url} alt={asset.title} className="h-full w-full object-cover" /> : <video src={asset.file_url} className="h-full w-full object-cover" muted />}
              </div>
              <p className="truncate p-2 text-xs">{asset.title}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}


