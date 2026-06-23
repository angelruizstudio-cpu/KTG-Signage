"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createPlaylist } from "@/lib/services/playlists";

export default function NewPlaylistPage() {
  const router = useRouter();
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    try {
      const playlist = await createPlaylist(supabase, organization.id, { name, description });
      router.push(`/dashboard/playlists/${playlist.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("playlistNew.error"));
    }
  }

  return (
    <>
      <PageHeader title={t("playlistNew.title")} description={t("playlistNew.description")} />
      <Card className="max-w-2xl">
        <form className="space-y-4" onSubmit={submit}>
          <Input placeholder={t("playlistNew.namePlaceholder")} value={name} onChange={(event) => setName(event.target.value)} required />
          <Textarea placeholder={t("playlistNew.descriptionPlaceholder")} value={description} onChange={(event) => setDescription(event.target.value)} />
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button>{t("playlistNew.submit")}</Button>
        </form>
      </Card>
    </>
  );
}
