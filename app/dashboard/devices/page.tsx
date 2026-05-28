"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { assignDeviceToScreen, listSignageDevices, pairSignageDevice, revokeSignageDevice } from "@/lib/services/devices";
import { listScreens } from "@/lib/services/screens";
import { formatDate } from "@/lib/utils/format";
import type { Screen, SignageDevice } from "@/types/signage";

export default function DevicesPage() {
  const { organization } = useCurrentOrganization();
  const supabase = createClient();
  const [devices, setDevices] = useState<SignageDevice[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [pairingCode, setPairingCode] = useState("");
  const [screenId, setScreenId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!organization) return;
    setLoading(true);
    const [nextDevices, nextScreens] = await Promise.all([
      listSignageDevices(supabase, organization.id),
      listScreens(supabase, organization.id)
    ]);
    setDevices(nextDevices);
    setScreens(nextScreens);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization]);

  if (loading) return <LoadingState label="Loading devices" />;

  return (
    <>
      <PageHeader
        title="Devices"
        description="Pair TVs without typing long URLs. Open /signage/pair on the TV, enter its code here, and choose the screen."
      />

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-semibold">Pair a TV or browser</h2>
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage(null);
            setError(null);
            try {
              await pairSignageDevice(supabase, pairingCode, screenId, deviceName);
              setPairingCode("");
              setScreenId("");
              setDeviceName("");
              setMessage("Device paired. The TV will open its player automatically.");
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not pair device.");
            }
          }}
        >
          <Input placeholder="KTG-123456" value={pairingCode} onChange={(event) => setPairingCode(event.target.value.toUpperCase())} required />
          <Select value={screenId} onChange={(event) => setScreenId(event.target.value)} required>
            <option value="">Choose screen</option>
            {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
          </Select>
          <Input placeholder="Device name" value={deviceName} onChange={(event) => setDeviceName(event.target.value)} />
          <Button>Pair</Button>
        </form>
        {message ? <p className="mt-3 text-sm text-online">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-offline">{error}</p> : null}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => (
          <Card key={device.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{device.name || "Unnamed device"}</h3>
                <p className="mt-1 text-xs text-slate-400">Last seen {formatDate(device.last_seen_at)}</p>
              </div>
              <Badge tone={device.status === "paired" ? "success" : device.status === "revoked" ? "danger" : "warning"}>{device.status}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <Select
                value={device.screen_id ?? ""}
                onChange={async (event) => {
                  await assignDeviceToScreen(supabase, device.id, event.target.value);
                  await load();
                }}
              >
                <option value="">No screen</option>
                {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
              </Select>
              <Button variant="danger" onClick={async () => { await revokeSignageDevice(supabase, device.id); await load(); }}>
                Revoke
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
