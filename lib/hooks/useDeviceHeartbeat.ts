"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateDeviceHeartbeat } from "@/lib/services/devices";

export function useDeviceHeartbeat(deviceKey: string | null) {
  useEffect(() => {
    if (!deviceKey) return;
    const supabase = createClient();
    const activeDeviceKey = deviceKey;
    let cancelled = false;

    async function beat() {
      try {
        await updateDeviceHeartbeat(supabase, activeDeviceKey);
      } catch (error) {
        console.warn("Device heartbeat failed", error);
      }
    }

    void beat();
    const interval = window.setInterval(() => {
      if (!cancelled) void beat();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [deviceKey]);
}
