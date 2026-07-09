"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createScreen } from "@/lib/services/screens";
import { getErrorMessage } from "@/lib/utils/errors";
import type { ScreenOrientation } from "@/types/signage";

export default function NewScreenPage() {
  const router = useRouter();
  const { organization, loading: organizationLoading } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [orientation, setOrientation] = useState<ScreenOrientation>("landscape");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization || loading) return;
    setLoading(true);
    setError(null);

    try {
      const screen = await createScreen(supabase, organization.id, { name, location, orientation });
      router.push(`/dashboard/screens/${screen.id}`);
    } catch (err) {
      setError(getErrorMessage(err, t("screenNew.error")));
    } finally {
      setLoading(false);
    }
  }

  if (organizationLoading) return <LoadingState label={t("shell.loadingWorkspace")} />;
  if (!organization) return <EmptyState title={t("shell.setupNeededTitle")} description={t("orgSetup.genericError")} />;

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
          <Button disabled={loading}>{loading ? t("common.save") : t("screenNew.submit")}</Button>
        </form>
      </Card>
    </>
  );
}
