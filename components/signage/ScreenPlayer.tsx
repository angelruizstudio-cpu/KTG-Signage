"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { useHeartbeat } from "@/lib/hooks/useHeartbeat";
import { useScreenRealtime } from "@/lib/hooks/useScreenRealtime";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { updateScreenHeartbeat } from "@/lib/services/screenPayload";
import type { ScreenPayloadItem } from "@/types/signage";
import { cn } from "@/lib/utils/cn";

function getDuration(item: ScreenPayloadItem) {
  return Math.max(3, item.display_duration_seconds || item.media_asset.duration_seconds || 10) * 1000;
}

export function ScreenPlayer({ screenKey }: { screenKey: string }) {
  const { t } = useLanguage();
  useHeartbeat(screenKey, updateScreenHeartbeat);
  const { payload, loading, error, usingStoredPayload, connectionState } = useScreenRealtime(screenKey);
  const [index, setIndex] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const hideCursorTimer = useRef<number | null>(null);
  const items = useMemo(() => payload?.items ?? [], [payload]);
  const current = items[index % Math.max(items.length, 1)];

  useEffect(() => {
    setIndex(0);
  }, [items.length, payload?.playlist?.id]);

  useEffect(() => {
    const showCursor = () => {
      setCursorHidden(false);
      if (hideCursorTimer.current) window.clearTimeout(hideCursorTimer.current);
      hideCursorTimer.current = window.setTimeout(() => setCursorHidden(true), 2500);
    };

    showCursor();
    window.addEventListener("mousemove", showCursor);
    return () => {
      window.removeEventListener("mousemove", showCursor);
      if (hideCursorTimer.current) window.clearTimeout(hideCursorTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!current || current.media_asset.media_type === "video") return;
    const timer = window.setTimeout(() => {
      setIndex((value) => (value + 1) % Math.max(items.length, 1));
    }, getDuration(current));
    return () => window.clearTimeout(timer);
  }, [current, items.length]);

  const advance = () => {
    setIndex((value) => (value + 1) % Math.max(items.length, 1));
  };

  if (loading && !payload) {
    return (
      <main className="grid min-h-screen place-items-center bg-black text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-3 w-3 animate-ping rounded-full bg-cyan" />
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{t("screenPlayer.loadingDisplay")}</p>
        </div>
      </main>
    );
  }

  if (!payload?.screen) {
    return (
      <main className="grid min-h-screen place-items-center bg-black p-8 text-white">
        <div className="max-w-xl text-center">
          <h1 className="text-4xl font-semibold">{t("screenPlayer.notFoundTitle")}</h1>
          <p className="mt-4 text-slate-400">{error ?? t("screenPlayer.notFoundHint")}</p>
        </div>
      </main>
    );
  }

  const portrait = payload.screen.orientation === "portrait";

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden bg-black text-white",
        cursorHidden && "hide-cursor",
        portrait && "mx-auto aspect-[9/16] min-h-screen max-w-[56.25vh]"
      )}
    >
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-md bg-black/50 px-3 py-2 text-xs text-white backdrop-blur">
        {connectionState === "connected" ? <Wifi className="h-4 w-4 text-online" /> : <WifiOff className="h-4 w-4 text-warning" />}
        {usingStoredPayload ? t("screenPlayer.offlineMode") : connectionState}
      </div>

      {items.length === 0 || !current ? (
        <section className="grid min-h-screen place-items-center p-10 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan">KTG Signage</p>
            <h1 className="mt-4 text-5xl font-semibold">{t("screenPlayer.noContentTitle")}</h1>
            <p className="mt-4 text-lg text-slate-400">{t("screenPlayer.noContentSubtitle", { name: payload.screen.name })}</p>
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
              onEnded={advance}
              onError={advance}
            />
          )}
        </section>
      )}
    </main>
  );
}
