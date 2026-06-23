"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { updateOrganization } from "@/lib/services/organizations";

export default function SettingsPage() {
  const { organization, reload } = useCurrentOrganization();
  const { t } = useLanguage();
  const supabase = createClient();
  const [name, setName] = useState(organization?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(organization?.primary_color ?? "#2563EB");
  const [alertEmail, setAlertEmail] = useState(organization?.alert_email ?? "");
  const [message, setMessage] = useState<string | null>(null);

  if (!organization) return null;

  return (
    <>
      <PageHeader title={t("settings.title")} description={t("settings.description")} />
      <Card className="max-w-2xl">
        <div className="space-y-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.namePlaceholder")} />
          <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder={t("settings.logoPlaceholder")} />
          <Input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
          <Button
            onClick={async () => {
              await updateOrganization(supabase, organization.id, { name, logo_url: logoUrl || null, primary_color: primaryColor });
              await reload();
              setMessage(t("settings.savedMessage"));
            }}
          >
            {t("settings.save")}
          </Button>
          {message ? <p className="text-sm text-online">{message}</p> : null}
        </div>
      </Card>
      <Card className="mt-6 max-w-2xl">
        <h2 className="text-lg font-semibold">{t("settings.alertsTitle")}</h2>
        <p className="mt-1 text-sm text-slate-400">{t("settings.alertsDescription")}</p>
        <div className="mt-4 space-y-4">
          <Input
            type="email"
            value={alertEmail}
            onChange={(event) => setAlertEmail(event.target.value)}
            placeholder={t("settings.alertEmailPlaceholder")}
          />
          <Button
            onClick={async () => {
              await updateOrganization(supabase, organization.id, { alert_email: alertEmail || null });
              await reload();
              setMessage(t("settings.savedMessage"));
            }}
          >
            {t("settings.save")}
          </Button>
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
