"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createScreen } from "@/lib/services/screens";
import type { ScreenOrientation } from "@/types/signage";

export default function NewScreenPage() {
  const router = useRouter();
  const { organization } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [orientation, setOrientation] = useState<ScreenOrientation>("landscape");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    try {
      const screen = await createScreen(supabase, organization.id, { name, location, orientation });
      router.push(`/dashboard/screens/${screen.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("screenNew.error"));
    }
  }

  return (
    <>
      <PageHeader title={t("screenNew.title")} description={t("screenNew.description")} />
      <Card className="max-w-2xl">
        <form className="space-y-4" onSubmit={submit}>
          <Input placeholder={t("screenNew.namePlaceholder")} value={name} onChange={(event) => setName(event.target.value)} required />
          <Input placeholder={t("screenNew.locationPlaceholder")} value={location} onChange={(event) => setLocation(event.target.value)} />
          <Select value={orientation} onChange={(event) => setOrientation(event.target.value as ScreenOrientation)}>
            <option value="landscape">{t("screenNew.landscape")}</option>
            <option value="portrait">{t("screenNew.portrait")}</option>
          </Select>
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button>{t("screenNew.submit")}</Button>
        </form>
      </Card>
    </>
  );
}
