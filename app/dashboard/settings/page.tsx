"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { Select } from "@/components/ui/Select";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { updateOrganization } from "@/lib/services/organizations";

const fallbackTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Puerto_Rico",
  "America/Mexico_City",
  "America/Bogota",
  "America/Sao_Paulo",
  "Europe/Madrid"
];

export default function SettingsPage() {
  const { organization, loading, error, reload } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#2563EB");
  const [timezone, setTimezone] = useState("UTC");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return fallbackTimezones;
    }
  }, []);

  useEffect(() => {
    if (!organization) return;
    setName(organization.name ?? "");
    setLogoUrl(organization.logo_url ?? "");
    setPrimaryColor(organization.primary_color ?? "#2563EB");
    setTimezone(organization.timezone ?? "UTC");
  }, [organization]);

  async function saveSettings() {
    if (!organization || saving) return;
    setSaving(true);
    setMessage(null);
    setSaveError(null);

    try {
      await updateOrganization(supabase, organization.id, { name, logo_url: logoUrl || null, primary_color: primaryColor, timezone });
      await reload();
      setMessage(t("settings.savedMessage"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save organization settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label={t("shell.loadingWorkspace")} />;

  if (error) {
    return <EmptyState title={t("shell.setupNeededTitle")} description={error} />;
  }

  if (!organization) {
    return <EmptyState title={t("shell.setupNeededTitle")} description="Create or select an organization before editing settings." />;
  }

  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <Card className="max-w-2xl">
        <div className="space-y-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.namePlaceholder")} />
          <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder={t("settings.logoPlaceholder")} />
          <Input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
          <div>
            <label className="mb-1 block text-sm text-slate-400" htmlFor="organization-timezone">
              {t("settings.timezoneLabel")}
            </label>
            <Select id="organization-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)}>
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500">{t("settings.timezoneHint")}</p>
          </div>
          <Button onClick={saveSettings} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : t("settings.save")}
          </Button>
          {message ? <p className="text-sm text-online">{message}</p> : null}
          {saveError ? <p className="text-sm text-offline">{saveError}</p> : null}
        </div>
      </Card>
      <Card className="mt-6 max-w-2xl">
        <h2 className="text-lg font-semibold">{t("settings.onboardingTitle")}</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>{t("settings.onboarding1")}</li>
          <li>{t("settings.onboarding2")}</li>
          <li>{t("settings.onboarding3")}</li>
          <li>{t("settings.onboarding4")}</li>
        </ul>
      </Card>
    </>
  );
}
