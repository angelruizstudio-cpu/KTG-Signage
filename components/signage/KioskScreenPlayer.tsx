"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize, Wifi, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useDeviceAssignment } from "@/lib/hooks/useDeviceAssignment";
import { useDeviceHeartbeat } from "@/lib/hooks/useDeviceHeartbeat";
import type { ScreenPayloadItem } from "@/types/signage";
import { cn } from "@/lib/utils/cn";

function durationMs(item: ScreenPayloadItem) {
  return Math.max(3, item.display_duration_seconds || item.media_asset.duration_seconds || 10) * 1000;
}

export function KioskScreenPlayer() {
  const { assignment, deviceKey, loading, error } = useDeviceAssignment();
  useDeviceHeartbeat(deviceKey);
  const [index, setIndex] = useState(0);
  const [kioskActive, setKioskActive] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const exitTimer = useRef<number | null>(null);
  const payload = assignment?.payload;
  const items = useMemo(() => payload?.items ?? [], [payload]);
  const current = items[index % Math.max(items.length, 1)];

  async function enterKiosk() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Some TV browsers only allow fullscreen after a remote click. The UI keeps a button visible until accepted.
    }
    setKioskActive(true);
  }

  async function exitKiosk() {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    setKioskActive(false);
    setShowExit(false);
  }

  useEffect(() => {
    const onFullscreen = () => setKioskActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const onMove = () => {
      setShowExit(true);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
      exitTimer.current = window.setTimeout(() => setShowExit(false), 3500);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onMove);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [payload?.playlist?.id, items.length]);

  useEffect(() => {
    if (!current || current.media_asset.media_type === "video") return;
    const timer = window.setTimeout(() => setIndex((value) => (value + 1) % Math.max(items.length, 1)), durationMs(current));
    return () => window.clearTimeout(timer);
  }, [current, items.length]);

  if (loading) {
    return <main className="grid min-h-screen place-items-center bg-black text-white">Loading device...</main>;
  }

  if (!deviceKey || assignment?.device?.status !== "paired") {
    return (
      <main className="grid min-h-screen place-items-center bg-black p-8 text-center text-white">
        <div>
          <h1 className="text-4xl font-semibold">Device is not paired</h1>
          <p className="mt-4 text-slate-400">Open /signage/pair on this device to get a pairing code.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={cn("relative min-h-screen overflow-hidden bg-black text-white", kioskActive && !showExit && "hide-cursor")}>
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-md bg-black/50 px-3 py-2 text-xs backdrop-blur">
        {error ? <WifiOff className="h-4 w-4 text-warning" /> : <Wifi className="h-4 w-4 text-online" />}
        {error ? "Reconnecting" : "Device paired"}
      </div>

      {!kioskActive || showExit ? (
        <div className="absolute left-4 top-4 z-30 flex gap-2">
          {!kioskActive ? (
            <Button onClick={enterKiosk}>
              <Maximize className="h-4 w-4" />
              Enter kiosk
            </Button>
          ) : (
            <Button variant="secondary" onClick={exitKiosk}>
              <X className="h-4 w-4" />
              Cancel kiosk
            </Button>
          )}
        </div>
      ) : null}

      {!payload?.screen || items.length === 0 || !current ? (
        <section className="grid min-h-screen place-items-center p-10 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan">KTG Signage</p>
            <h1 className="mt-4 text-5xl font-semibold">No content assigned</h1>
            <p className="mt-4 text-lg text-slate-400">Assign a playlist to {assignment.screen?.name ?? "this screen"}.</p>
          </div>
        </section>
      ) : (
        <section key={`${current.id}-${index}`} className="fade-in grid min-h-screen place-items-center">
          {current.media_asset.media_type === "image" ? (
            <img src={current.media_asset.file_url} alt={current.media_asset.title} className="h-screen w-screen object-contain" />
          ) : (
            <video
              src={current.media_asset.file_url}
              className="h-screen w-screen object-contain"
              autoPlay
              muted
              playsInline
              onEnded={() => setIndex((value) => (value + 1) % Math.max(items.length, 1))}
              onError={() => setIndex((value) => (value + 1) % Math.max(items.length, 1))}
            />
          )}
        </section>
      )}
    </main>
  );
}
