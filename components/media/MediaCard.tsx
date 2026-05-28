"use client";

import { ImageIcon, Video } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatBytes, formatDate } from "@/lib/utils/format";
import type { MediaAsset } from "@/types/signage";

export function MediaCard({
  asset,
  onToggle,
  onEdit,
  onDelete
}: {
  asset: MediaAsset;
  onToggle?: (asset: MediaAsset) => void;
  onEdit?: (asset: MediaAsset) => void;
  onDelete?: (asset: MediaAsset) => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="aspect-video bg-surface">
        {asset.media_type === "image" ? (
          <img src={asset.file_url} alt={asset.title} className="h-full w-full object-cover" />
        ) : (
          <video src={asset.file_url} className="h-full w-full object-cover" muted preload="metadata" />
        )}
      </div>
      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{asset.title}</h3>
            <p className="mt-1 text-xs text-slate-400">{formatDate(asset.created_at)}</p>
          </div>
          <Badge tone={asset.is_active ? "success" : "neutral"}>{asset.is_active ? "Active" : "Inactive"}</Badge>
        </div>
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            {asset.media_type === "image" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
            {asset.media_type}
          </span>
          <span>{formatBytes(asset.file_size)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onEdit?.(asset)}>
            Edit
          </Button>
          <Button variant="secondary" onClick={() => onToggle?.(asset)}>
            {asset.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="ghost" onClick={() => onDelete?.(asset)}>
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}
