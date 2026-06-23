"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, RefreshCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { appUrl, formatDate } from "@/lib/utils/format";
import { assignPlaylistToScreen, deleteScreen, getScreen, regenerateScreenKey, updateScreen } from "@/lib/services/screens";
import { listPlaylists } from "@/lib/services/playlists";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { Playlist, Screen, ScreenOrientation } from "@/types/signage";

export default function ScreenDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [orientation, setOrientation] = useState<ScreenOrientation>("landscape");
  const [playlistId, setPlaylistId] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const playerUrl = useMemo(() => (screen ? appUrl(`/signage/screen/${screen.screen_key}`) : ""), [screen]);

  useEffect(() => {
    if (!organization) return;
    const organizationId = organization.id;
    async function load() {
      const [nextScreen, nextPlaylists] = await Promise.all([getScreen(supabase, params.id), listPlaylists(supabase, organizationId)]);
      setScreen(nextScreen);
      setName(nextScreen.name);
      setLocation(nextScreen.location ?? "");
      setOrientation(nextScreen.orientation);
      setPlaylistId(nextScreen.current_playlist_id ?? "");
      setPlaylists(nextPlaylists);
    }
    void load();
  }, [organization, params.id, supabase]);

  if (!screen) return <LoadingState label={t("screenDetail.loading")} />;

  async function save() {
    if (!screen) return;
    setError(null);
    try {
      const updated = await updateScreen(supabase, screen.id, { name, location: location || null, orientation });
      await assignPlaylistToScreen(supabase, screen.id, playlistId || null);
      setScreen({ ...updated, current_playlist_id: playlistId || null });
      setMessage(t("screenDetail.savedMessage"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("screenDetail.saveError"));
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(playerUrl);
    setMessage(t("screenDetail.copiedMessage"));
  }

  return (
    <>
      <PageHeader
        title={screen.name}
        description={t("screenDetail.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={copyUrl}>
              <Copy className="h-4 w-4" />
              {t("screenDetail.copyUrl")}
            </Button>
            <a href={playerUrl} target="_blank" rel="noreferrer">
              <Button>
                <ExternalLink className="h-4 w-4" />
                {t("screenDetail.openPlayer")}
              </Button>
            </a>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="grid gap-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("screenDetail.namePlaceholder")} />
            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder={t("screenDetail.locationPlaceholder")} />
            <Select value={orientation} onChange={(event) => setOrientation(event.target.value as ScreenOrientation)}>
              <option value="landscape">{t("screenDetail.landscape")}</option>
              <option value="portrait">{t("screenDetail.portrait")}</option>
            </Select>
            <Select value={playlistId} onChange={(event) => setPlaylistId(event.target.value)}>
              <option value="">{t("screenDetail.noPlaylist")}</option>
              {playlists.filter((playlist) => playlist.is_active).map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </Select>
            {error ? <p className="text-sm text-offline">{error}</p> : null}
            {message ? <p className="text-sm text-online">{message}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button onClick={save}>{t("screenDetail.saveChanges")}</Button>
              <Button variant="secondary" onClick={() => setConfirmRegenerate(true)}>
                <RefreshCcw className="h-4 w-4" />
                {t("screenDetail.regenerateKey")}
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4" />
                {t("common.delete")}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">{t("screenDetail.statusTitle")}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">{t("screenDetail.status")}</span><StatusBadge status={screen.status} /></div>
            <div className="flex justify-between gap-4"><span className="text-slate-400">{t("screenDetail.lastSeen")}</span><span>{formatDate(screen.last_seen_at)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-400">{t("screenDetail.key")}</span><span className="truncate">{screen.screen_key}</span></div>
          </div>
          <Link href="/dashboard/playlists" className="mt-5 block text-sm text-cyan">{t("screenDetail.managePlaylists")}</Link>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmRegenerate}
        title={t("screenDetail.regenerateTitle")}
        message={t("screenDetail.regenerateMessage")}
        onCancel={() => setConfirmRegenerate(false)}
        onConfirm={async () => {
          const updated = await regenerateScreenKey(supabase, screen);
          setScreen(updated);
          setConfirmRegenerate(false);
          setMessage(t("screenDetail.regeneratedMessage"));
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("screenDetail.deleteTitle")}
        message={t("screenDetail.deleteMessage")}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await deleteScreen(supabase, screen.id);
          router.push("/dashboard/screens");
        }}
      />
    </>
  );
}
