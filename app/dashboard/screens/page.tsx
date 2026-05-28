"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ScreenStatusCard } from "@/components/screens/ScreenStatusCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { listScreens } from "@/lib/services/screens";
import type { Screen } from "@/types/signage";

export default function ScreensPage() {
  const { organization } = useCurrentOrganization();
  const supabase = createClient();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    listScreens(supabase, organization.id)
      .then(setScreens)
      .finally(() => setLoading(false));
  }, [organization, supabase]);

  if (loading) return <LoadingState label="Loading screens" />;

  return (
    <>
      <PageHeader
        title="Screens"
        description="Create and manage every digital display in your organization."
        action={
          <Link href="/dashboard/screens/new">
            <Button>
              <Plus className="h-4 w-4" />
              New screen
            </Button>
          </Link>
        }
      />
      {screens.length === 0 ? (
        <EmptyState title="No screens yet" description="Create your first screen to get a unique player URL." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {screens.map((screen) => (
            <ScreenStatusCard key={screen.id} screen={screen} />
          ))}
        </div>
      )}
    </>
  );
}
