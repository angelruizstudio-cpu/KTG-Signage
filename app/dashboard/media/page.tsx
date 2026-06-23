"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { MediaCard } from "@/components/media/MediaCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { deleteMediaAsset, listMediaAssets, updateMediaAsset } from "@/lib/services/media";
import type { MediaAsset } from "@/types/signage";

export default function MediaPage() {
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [editTarget, setEditTarget] = useState<MediaAsset | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function load() {
    if (!organization) return;
    setLoading(true);
    setAssets(await listMediaAssets(supabase, organization.id));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization]);

  if (loading) return <LoadingState label={t("media.loading")} />;

  return (
    <>
      <PageHeader
        title={t("media.title")}
        description={t("media.description")}
        action={
          <Link href="/dashboard/media/upload">
            <Button>
              <Upload className="h-4 w-4" />
              {t("media.uploadMedia")}
            </Button>
          </Link>
        }
      />
      {assets.length === 0 ? (
        <EmptyState title={t("media.emptyTitle")} description={t("media.emptyDescription")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              onToggle={async (nextAsset) => {
                await updateMediaAsset(supabase, nextAsset.id, { is_active: !nextAsset.is_active });
                await load();
              }}
              onEdit={(asset) => {
                setEditTarget(asset);
                setEditTitle(asset.title);
                setEditDescription(asset.description ?? "");
              }}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={t("media.deleteTitle")}
        message={t("media.deleteMessage")}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteMediaAsset(supabase, deleteTarget);
          setDeleteTarget(null);
          await load();
        }}
      />
      <Modal open={Boolean(editTarget)} title={t("media.editTitle")} onClose={() => setEditTarget(null)}>
        <div className="space-y-4">
          <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder={t("media.titlePlaceholder")} />
          <Textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} placeholder={t("media.descriptionPlaceholder")} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditTarget(null)}>{t("common.cancel")}</Button>
            <Button
              onClick={async () => {
                if (!editTarget) return;
                await updateMediaAsset(supabase, editTarget.id, { title: editTitle, description: editDescription || null });
                setEditTarget(null);
                await load();
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
