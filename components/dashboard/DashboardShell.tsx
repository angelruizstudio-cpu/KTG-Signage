"use client";

import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CurrentOrganizationProvider, useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { OrganizationSetup } from "./OrganizationSetup";

export function DashboardShell({ children }: { children: ReactNode }) {
  const organizationState = useCurrentOrganization();
  const { organization, loading, error, reload } = organizationState;
  const { t } = useLanguage();

  if (loading) {
    return (
      <main className="min-h-screen bg-deep">
        <LoadingState label={t("shell.loadingWorkspace")} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-deep p-6">
        <EmptyState title={t("shell.setupNeededTitle")} description={error} />
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
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8"><CurrentOrganizationProvider value={organizationState}>{children}</CurrentOrganizationProvider></main>
      </div>
    </div>
  );
}

