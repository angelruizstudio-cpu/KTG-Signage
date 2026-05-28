import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { appUrl, formatDate } from "@/lib/utils/format";
import type { Screen } from "@/types/signage";

export function ScreenStatusCard({ screen }: { screen: Screen }) {
  const playerUrl = appUrl(`/signage/screen/${screen.screen_key}`);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{screen.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{screen.location || "No location"}</p>
        </div>
        <StatusBadge status={screen.status} />
      </div>
      <dl className="mt-5 grid gap-3 text-sm text-slate-300">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Orientation</dt>
          <dd className="capitalize">{screen.orientation}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Last seen</dt>
          <dd>{formatDate(screen.last_seen_at)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/dashboard/screens/${screen.id}`}>
          <Button variant="secondary">Edit</Button>
        </Link>
        <a href={playerUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost">
            <ExternalLink className="h-4 w-4" />
            Player
          </Button>
        </a>
      </div>
    </Card>
  );
}
