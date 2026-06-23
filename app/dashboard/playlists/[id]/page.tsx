"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PlaylistBuilder, type BuilderItem } from "@/components/playlists/PlaylistBuilder";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { listMediaAssets } from "@/lib/services/media";
import { addMediaToPlaylist, getPlaylist, getPlaylistItems, removePlaylistItem, updatePlaylist, updatePlaylistItem } from "@/lib/services/playlists";
import { assignPlaylistToScreen, listScreens } from "@/lib/services/screens";
import type { MediaAsset, Playlist, Screen } from "@/types/signage";

export default function PlaylistEditPage() {
  const params = useParams<{ id: string }>();
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [assignScreenId, setAssignScreenId] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    if (!organization) return;
    const [nextPlaylist, nextItems, nextMedia, nextScreens] = await Promise.all([
      getPlaylist(supabase, params.id),
      getPlaylistItems(supabase, params.id),
      listMediaAssets(supabase, organization.id),
      listScreens(supabase, organization.id)
    ]);
    setPlaylist(nextPlaylist);
    setItems(nextItems);
    setMedia(nextMedia);
    setScreens(nextScreens);
  }

  useEffect(() => {
    void load();
  }, [organization, params.id]);

  if (!playlist) return <LoadingState label={t("playlistEdit.loading")} />;

  return (
    <>
      <PageHeader title={playlist.name} description={t("playlistEdit.description")} />
      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input value={playlist.name} onChange={(event) => setPlaylist({ ...playlist, name: event.target.value })} />
          <Select value={playlist.is_active ? "active" : "inactive"} onChange={(event) => setPlaylist({ ...playlist, is_active: event.target.value === "active" })}>
            <option value="active">{t("common.active")}</option>
            <option value="inactive">{t("common.inactive")}</option>
          </Select>
          <Textarea className="md:col-span-2" value={playlist.description ?? ""} onChange={(event) => setPlaylist({ ...playlist, description: event.target.value })} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            onClick={async () => {
              const updated = await updatePlaylist(supabase, playlist.id, {
                name: playlist.name,
                description: playlist.description,
                is_active: playlist.is_active
              });
              setPlaylist(updated);
              setMessage(t("playlistEdit.savedMessage"));
            }}
          >
            {t("playlistEdit.savePlaylist")}
          </Button>
          <Select className="max-w-xs" value={assignScreenId} onChange={(event) => setAssignScreenId(event.target.value)}>
            <option value="">{t("playlistEdit.assignToScreen")}</option>
            {screens.map((screen) => (
              <option key={screen.id} value={screen.id}>
                {screen.name}
              </option>
            ))}
          </Select>
          <Button
            variant="secondary"
            disabled={!assignScreenId || !playlist.is_active}
            onClick={async () => {
              await assignPlaylistToScreen(supabase, assignScreenId, playlist.id);
              setMessage(t("playlistEdit.assignedMessage"));
            }}
          >
            {t("playlistEdit.assign")}
          </Button>
          {message ? <p className="text-sm text-online">{message}</p> : null}
        </div>
      </Card>
      <PlaylistBuilder
        items={items}
        mediaAssets={media}
        onAdd={async (asset) => {
          await addMediaToPlaylist(supabase, playlist.id, asset, items.length);
          await load();
        }}
        onRemove={async (item) => {
          await removePlaylistItem(supabase, item.id);
          await load();
        }}
        onUpdate={async (item, values) => {
          if (values.sort_order !== undefined) {
            const currentIndex = items.findIndex((candidate) => candidate.id === item.id);
            const targetIndex = items.findIndex((candidate) => candidate.sort_order === values.sort_order);
            if (currentIndex >= 0 && targetIndex >= 0) {
              const reordered = [...items];
              const [moved] = reordered.splice(currentIndex, 1);
              reordered.splice(targetIndex, 0, moved);
              await Promise.all(
                reordered.map((reorderedItem, nextIndex) =>
                  updatePlaylistItem(supabase, reorderedItem.id, { sort_order: nextIndex })
                )
              );
              await load();
              return;
            }
          }

          await updatePlaylistItem(supabase, item.id, values);
          await load();
        }}
      />
    </>
  );
}
