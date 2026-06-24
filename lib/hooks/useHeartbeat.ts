"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export function useHeartbeat(key: string | null, beat: (supabase: SupabaseClient, key: string) => Promise<unknown>) {
  useEffect(() => {
    if (!key) return;
    const activeKey = key;
    const supabase = createClient();
    let cancelled = false;

    async function run() {
      try {
        await beat(supabase, activeKey);
      } catch (error) {
        console.warn("Heartbeat failed", error);
      }
    }

    void run();
    const interval = window.setInterval(() => {
      if (!cancelled) void run();
    }, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [key, beat]);
}
