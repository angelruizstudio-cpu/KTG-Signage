"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { ensureInitialOrganization } from "@/lib/services/organizations";
import { getErrorMessage } from "@/lib/utils/errors";

export function OrganizationSetup({ onCreated }: { onCreated: () => void }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new Error("You must be logged in to create an organization.");

      await ensureInitialOrganization(
        supabase,
        user,
        fullName || user.user_metadata.full_name || user.email || "KTG User",
        organizationName
      );

      onCreated();
    } catch (err) {
      setError(getErrorMessage(err, "Could not create organization."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-deep p-6">
      <Card className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-brand">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold">Create your organization</h1>
            <p className="mt-1 text-sm text-slate-400">Your account exists, but it is not connected to an organization yet.</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Your full name</span>
            <Input placeholder="Angel M Ruiz" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-300">Organization name</span>
          <Input
              placeholder="ICP East Chicago"
            value={organizationName}
            onChange={(event) => setOrganizationName(event.target.value)}
            required
          />
          </label>
          {error ? <p className="text-sm text-offline">{error}</p> : null}
          <Button className="w-full" disabled={loading}>
            {loading ? "Creating workspace..." : "Create organization"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
