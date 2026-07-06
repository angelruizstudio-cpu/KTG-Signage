"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { createClient } from "@/lib/supabase/client";
import { getDeviceAssignment, startDevicePairing } from "@/lib/services/devices";
import { deviceKeyStorageKey } from "@/lib/hooks/useDeviceAssignment";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function PairDevicePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startPairing() {
    setError(null);
    try {
      const result = await startDevicePairing(supabase, navigator.userAgent);
      window.localStorage.setItem(deviceKeyStorageKey, result.device_key);
      setDeviceKey(result.device_key);
      setPairingCode(result.pairing_code);
      setExpiresAt(result.expires_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pair.error"));
    }
  }

  useEffect(() => {
    const existing = window.localStorage.getItem(deviceKeyStorageKey);
    if (existing) {
      router.replace("/signage/player");
      return;
    }
    void startPairing();
  }, []);

  // Anonymous devices cannot read signage_devices through RLS, so pairing
  // completion arrives via broadcast on the device_key topic, with polling
  // as the backstop.
  useEffect(() => {
    if (!deviceKey) return;

    const goToPlayerIfPaired = async () => {
      try {
        const assignment = await getDeviceAssignment(supabase, deviceKey);
        if (assignment?.device?.status === "paired") router.replace("/signage/player");
      } catch {
        // Keep waiting; the poll retries.
      }
    };

    const channel = supabase
      .channel(`device-signal:${deviceKey}`)
      .on("broadcast", { event: "device_updated" }, () => void goToPlayerIfPaired())
      .subscribe();

    const pollTimer = window.setInterval(() => void goToPlayerIfPaired(), 5000);

    return () => {
      window.clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [deviceKey, router, supabase]);

  return (
    <main className="grid min-h-screen place-items-center bg-black p-8 text-center text-white">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <section className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan">{t("pair.kicker")}</p>
        <h1 className="mt-4 text-5xl font-semibold">{t("pair.title")}</h1>
        <p className="mt-4 text-lg text-slate-400">{t("pair.subtitle")}</p>
        <div className="mt-10 rounded-lg border border-slate-700 bg-surface p-8">
          <div className="text-6xl font-bold tracking-widest text-cyan">{pairingCode ?? "..."}</div>
          <p className="mt-4 text-sm text-slate-400">{t("pair.expires", { time: expiresAt ? new Date(expiresAt).toLocaleTimeString() : t("pair.soon") })}</p>
        </div>
        {error ? <p className="mt-5 text-offline">{error}</p> : null}
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="secondary" onClick={startPairing}>{t("pair.generateNew")}</Button>
          <Button onClick={() => router.push("/signage/player")}>{t("pair.openPlayer")}</Button>
        </div>
      </section>
    </main>
  );
}
