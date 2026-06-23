"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { MediaAsset, PlaylistItem } from "@/types/signage";

export type BuilderItem = PlaylistItem & { media_asset: MediaAsset | null };

interface PlaylistBuilderProps {
  items: BuilderItem[];
  mediaAssets: MediaAsset[];
  onAdd: (asset: MediaAsset) => void;
  onRemove: (item: BuilderItem) => void;
  onUpdate: (item: BuilderItem, values: Partial<Pick<PlaylistItem, "display_duration_seconds" | "is_active" | "sort_order">>) => void;
}

export function PlaylistBuilder({ items, mediaAssets, onAdd, onRemove, onUpdate }: PlaylistBuilderProps) {
  const { t } = useLanguage();
  const activeMedia = mediaAssets.filter((asset) => asset.is_active);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("playlistBuilder.itemsTitle")}</h2>
          <Badge tone="info">{t("playlistBuilder.itemsCount", { count: items.length })}</Badge>
        </div>
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
              {t("playlistBuilder.emptyItems")}
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id} className="grid gap-3 rounded-lg border border-slate-800 bg-surface p-3 md:grid-cols-[96px_1fr_auto]">
                <div className="aspect-video overflow-hidden rounded-md bg-black">
                  {item.media_asset?.media_type === "image" ? (
                    <img src={item.media_asset.file_url} alt={item.media_asset.title} className="h-full w-full object-cover" />
                  ) : item.media_asset ? (
                    <video src={item.media_asset.file_url} className="h-full w-full object-cover" muted />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{item.media_asset?.title ?? t("playlistBuilder.missingMedia")}</h3>
                    <Badge tone={item.is_active ? "success" : "neutral"}>{item.is_active ? t("common.active") : t("playlistBuilder.hidden")}</Badge>
                  </div>
                  <div className="mt-3 flex max-w-sm items-center gap-2">
                    <label className="text-xs text-slate-400">{t("playlistBuilder.seconds")}</label>
                    <Input
                      type="number"
                      min={3}
                      value={item.display_duration_seconds}
                      onChange={(event) => onUpdate(item, { display_duration_seconds: Number(event.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" className="h-9 w-9 px-0" disabled={index === 0} onClick={() => onUpdate(item, { sort_order: items[index - 1]?.sort_order ?? 0 })}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" className="h-9 w-9 px-0" disabled={index === items.length - 1} onClick={() => onUpdate(item, { sort_order: items[index + 1]?.sort_order ?? item.sort_order + 1 })}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => onUpdate(item, { is_active: !item.is_active })}>
                    {item.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" className="h-9 w-9 px-0" onClick={() => onRemove(item)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("playlistBuilder.addMediaTitle")}</h2>
        <div className="space-y-3">
          {activeMedia.length === 0 ? (
            <p className="text-sm text-slate-400">{t("playlistBuilder.noActiveMedia")}</p>
          ) : (
            activeMedia.map((asset) => (
              <button
                key={asset.id}
                className="flex w-full items-center gap-3 rounded-md border border-slate-800 bg-surface p-2 text-left hover:border-cyan"
                onClick={() => onAdd(asset)}
              >
                <div className="h-14 w-20 overflow-hidden rounded bg-black">
                  {asset.media_type === "image" ? (
                    <img src={asset.file_url} alt={asset.title} className="h-full w-full object-cover" />
                  ) : (
                    <video src={asset.file_url} className="h-full w-full object-cover" muted />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm">{asset.title}</span>
                <Plus className="h-4 w-4 text-cyan" />
              </button>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
