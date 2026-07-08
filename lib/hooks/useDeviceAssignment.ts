"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getDeviceAssignment } from "@/lib/services/devices";
import type { DeviceAssignment } from "@/types/signage";

export const deviceKeyStorageKey = "ktg-signage:device-key";

// RLS blocks anonymous devices from reading signage_devices, so updates arrive
// through Realtime Broadcast on the device_key topic. Polling is the backstop:
// fast while waiting to be paired, slow once content is playing.
const PENDING_POLL_MS = 5 * 1000;
const PAIRED_POLL_MS = 5 * 60 * 1000;

export function useDeviceAssignment() {
  const supabase = useMemo(() => createClient(), []);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<DeviceAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDeviceKey(window.localStorage.getItem(deviceKeyStorageKey));
  }, []);

  const reload = useCallback(async () => {
    const key = window.localStorage.getItem(deviceKeyStorageKey);
    setDeviceKey(key);
    if (!key) {
      setAssignment(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const nextAssignment = await getDeviceAssignment(supabase, key);
      setAssignment(nextAssignment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load device assignment.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const paired = assignment?.device?.status === "paired";
  const assignedScreenKey = assignment?.payload?.screen?.screen_key ?? null;

  useEffect(() => {
    if (!deviceKey) return;
    const channels: RealtimeChannel[] = [];

    channels.push(
      supabase
        .channel(`device-signal:${deviceKey}`)
        .on("broadcast", { event: "device_updated" }, () => {
          void reload();
        })
        .subscribe()
    );

    if (assignedScreenKey) {
      channels.push(
        supabase
          .channel(`screen-signal:${assignedScreenKey}`)
          .on("broadcast", { event: "screen_updated" }, () => void reload())
          .subscribe()
      );
    }

    const pollTimer = window.setInterval(() => {
      if (navigator.onLine) void reload();
    }, paired ? PAIRED_POLL_MS : PENDING_POLL_MS);

    return () => {
      window.clearInterval(pollTimer);
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [assignedScreenKey, deviceKey, paired, reload, supabase]);

  return { assignment, deviceKey, loading, error, reload };
}
