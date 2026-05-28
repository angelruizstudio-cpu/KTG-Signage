"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganization } from "@/lib/services/organizations";
import type { Organization, OrganizationMember } from "@/types/signage";

export function useCurrentOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = await getCurrentOrganization(supabase);
      setOrganization(current?.organization ?? null);
      setMembership(current?.membership ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load organization.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { organization, membership, loading, error, reload };
}
