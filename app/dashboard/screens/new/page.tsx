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
import { createScreen } from "@/lib/services/screens";
import type { ScreenOrientation } from "@/types/signage";

export default function NewScreenPage() {
  const router = useRouter();
  const { organization } = useCurrentOrganization();
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
      setError(err instanceof Error ? err.message : "Could not create screen.");
    }
  }

  return (
    <>
      <PageHeader title="Create screen" description="Each screen gets a secure unique URL for TVs, Fire Sticks, mini PCs, tablets, and browsers." />
      <Card className="max-w-2xl">
        <form className="space-y-4" onSubmit={submit}>
          <Input placeholder="Screen name" value={name} onChange={(event) => setName(event.target.value)} required />
          <Input placeholder="Location" value={location} onChange={(event) => setLocation(event.target.value)} />
          <Select value={orientation} onChange={(event) => setOrientation(event.target.value as ScreenOrientation)}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </Select>
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button>Create screen</Button>
        </form>
      </Card>
    </>
  );
}
