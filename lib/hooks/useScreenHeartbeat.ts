"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateScreenHeartbeat } from "@/lib/services/screenPayload";

export function useScreenHeartbeat(screenKey: string) {
  useEffect(() => {
    if (!screenKey) return;
    const supabase = createClient();
    let cancelled = false;

    async function beat() {
      try {
        await updateScreenHeartbeat(supabase, screenKey);
      } catch (error) {
        console.warn("Heartbeat failed", error);
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
  }, [screenKey]);
}
