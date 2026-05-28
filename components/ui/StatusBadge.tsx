import { Badge } from "./Badge";
import type { ScreenStatus } from "@/types/signage";

export function StatusBadge({ status }: { status: ScreenStatus }) {
  if (status === "online") return <Badge tone="success">Online</Badge>;
  if (status === "maintenance") return <Badge tone="warning">Maintenance</Badge>;
  return <Badge tone="danger">Offline</Badge>;
}
