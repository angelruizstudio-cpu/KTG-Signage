"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getScreenPayload, logScreenEvent } from "@/lib/services/screenPayload";
import type { ScreenPayload } from "@/types/signage";
import { useOnlineStatus } from "./useOnlineStatus";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

function storageKey(screenKey: string) {
  return `ktg-signage:last-payload:${screenKey}`;
}

function readStoredPayload(screenKey: string) {
  try {
    const stored = window.localStorage.getItem(storageKey(screenKey));
    return stored ? (JSON.parse(stored) as ScreenPayload) : null;
  } catch {
    return null;
  }
}

export function useScreenRealtime(screenKey: string) {
  const supabase = useMemo(() => createClient(), []);
  const online = useOnlineStatus();
  const [payload, setPayload] = useState<ScreenPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingStoredPayload, setUsingStoredPayload] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const payloadRef = useRef<ScreenPayload | null>(null);

  const savePayload = useCallback(
    async (nextPayload: ScreenPayload, eventType = "payload_loaded") => {
      setPayload(nextPayload);
      payloadRef.current = nextPayload;
      setUsingStoredPayload(false);
      window.localStorage.setItem(storageKey(screenKey), JSON.stringify(nextPayload));
      if (nextPayload.screen?.id) {
        await logScreenEvent(supabase, nextPayload.screen.id, eventType).catch(() => undefined);
      }
    },
    [screenKey, supabase]
  );

  const loadPayload = useCallback(
    async (eventType = "payload_loaded") => {
      try {
        setError(null);
        const nextPayload = await getScreenPayload(supabase, screenKey);
        await savePayload(nextPayload, eventType);
        setConnectionState("connected");
      } catch (err) {
        const stored = readStoredPayload(screenKey);
        if (stored) {
          setPayload(stored);
          payloadRef.current = stored;
          setUsingStoredPayload(true);
          setConnectionState("offline");
          if (stored.screen?.id) {
            await logScreenEvent(supabase, stored.screen.id, "offline_mode_started").catch(() => undefined);
          }
        }
        setError(err instanceof Error ? err.message : "Could not load screen payload.");
      } finally {
        setLoading(false);
      }
    },
    [savePayload, screenKey, supabase]
  );

  useEffect(() => {
    setLoading(true);
    void loadPayload();
  }, [loadPayload]);

  useEffect(() => {
    if (!online) {
      const stored = readStoredPayload(screenKey);
      if (stored && !payloadRef.current) {
        setPayload(stored);
        payloadRef.current = stored;
        setUsingStoredPayload(true);
        setLoading(false);
      }
      setConnectionState("offline");
      return;
    }

    if (usingStoredPayload) {
      setConnectionState("reconnecting");
      void loadPayload("online_mode_restored");
    }
  }, [loadPayload, online, screenKey, usingStoredPayload]);

  useEffect(() => {
    if (!payload?.screen?.id) return;

    const screen = payload.screen;
    let reloadTimer: number | null = null;
    const channels: RealtimeChannel[] = [];

    const queueReload = (eventType = "playlist_changed") => {
      if (reloadTimer) window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        setConnectionState("reconnecting");
        void loadPayload(eventType);
      }, 250);
    };

    channels.push(
      supabase
        .channel(`screen-signal-${screen.screen_key}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "screen_update_signals", filter: `screen_key=eq.${screen.screen_key}` }, () => queueReload())
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setConnectionState("connected");
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnectionState("reconnecting");
        })
    );

    return () => {
      if (reloadTimer) window.clearTimeout(reloadTimer);
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [loadPayload, payload, supabase]);

  return { payload, loading, error, usingStoredPayload, connectionState, reload: loadPayload };
}
