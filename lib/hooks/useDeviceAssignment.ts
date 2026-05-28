"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getDeviceAssignment } from "@/lib/services/devices";
import type { DeviceAssignment } from "@/types/signage";

export const deviceKeyStorageKey = "ktg-signage:device-key";

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

  useEffect(() => {
    if (!deviceKey) return;
    const channels: RealtimeChannel[] = [];

    channels.push(
      supabase
        .channel(`device-key-${deviceKey}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "signage_devices", filter: `device_key=eq.${deviceKey}` }, () => {
          void reload();
        })
        .subscribe()
    );

    if (assignment?.payload?.screen?.id) {
      const screen = assignment.payload.screen;

      channels.push(
        supabase
          .channel(`device-screen-signal-${screen.screen_key}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "screen_update_signals", filter: `screen_key=eq.${screen.screen_key}` }, () => void reload())
          .subscribe()
      );
    }

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [assignment, deviceKey, reload, supabase]);

  return { assignment, deviceKey, loading, error, reload };
}
