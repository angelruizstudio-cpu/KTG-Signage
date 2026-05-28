"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { OrganizationSetup } from "./OrganizationSetup";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { organization, loading, error, reload } = useCurrentOrganization();

  if (loading) {
    return (
      <main className="min-h-screen bg-deep">
        <LoadingState label="Loading workspace" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-deep p-6">
        <EmptyState title="Organization setup needed" description={error} />
      </main>
    );
  }

  if (!organization) {
    return <OrganizationSetup onCreated={reload} />;
  }

  return (
    <div className="flex min-h-screen bg-deep">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Topbar organization={organization} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
