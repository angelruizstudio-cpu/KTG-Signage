"use client";

import { useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { createClient } from "@/lib/supabase/client";
import { updateOrganization } from "@/lib/services/organizations";

export default function SettingsPage() {
  const { organization, reload } = useCurrentOrganization();
  const supabase = createClient();
  const [name, setName] = useState(organization?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(organization?.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(organization?.primary_color ?? "#2563EB");
  const [message, setMessage] = useState<string | null>(null);

  if (!organization) return null;

  return (
    <>
      <PageHeader title="Settings" description="Organization settings are owner-only through RLS. Editors and viewers cannot modify them." />
      <Card className="max-w-2xl">
        <div className="space-y-4">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Organization name" />
          <Input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} placeholder="Logo URL" />
          <Input type="color" value={primaryColor} onChange={(event) => setPrimaryColor(event.target.value)} />
          <Button
            onClick={async () => {
              await updateOrganization(supabase, organization.id, { name, logo_url: logoUrl || null, primary_color: primaryColor });
              await reload();
              setMessage("Settings saved.");
            }}
          >
            Save settings
          </Button>
          {message ? <p className="text-sm text-online">{message}</p> : null}
        </div>
      </Card>
      <Card className="mt-6 max-w-2xl">
        <h2 className="text-lg font-semibold">Onboarding</h2>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li>Upload your first media asset.</li>
          <li>Create or edit your first playlist.</li>
          <li>Assign the playlist to a screen.</li>
          <li>Open /signage/pair on your TV and pair it from Dashboard → Devices.</li>
        </ul>
      </Card>
    </>
  );
}
