"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentOrganization } from "@/lib/services/organizations";
import type { Organization, OrganizationMember } from "@/types/signage";

type CurrentOrganizationState = {
  organization: Organization | null;
  membership: OrganizationMember | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const CurrentOrganizationContext = createContext<CurrentOrganizationState | null>(null);

export function CurrentOrganizationProvider({ value, children }: { value: CurrentOrganizationState; children: ReactNode }) {
  return createElement(CurrentOrganizationContext.Provider, { value }, children);
}

function useLoadCurrentOrganization(): CurrentOrganizationState {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

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

export function useCurrentOrganization() {
  const context = useContext(CurrentOrganizationContext);
  if (context) return context;
  return useLoadCurrentOrganization();
}

