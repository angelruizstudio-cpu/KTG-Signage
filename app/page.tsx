"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Monitor, PlayCircle, Upload, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function LandingPage() {
  const { t } = useLanguage();

  const features = [
    { icon: Wifi, title: t("landing.feature1Title"), text: t("landing.feature1Text") },
    { icon: Monitor, title: t("landing.feature2Title"), text: t("landing.feature2Text") },
    { icon: Upload, title: t("landing.feature3Title"), text: t("landing.feature3Text") },
    { icon: CalendarClock, title: t("landing.feature4Title"), text: t("landing.feature4Text") }
  ];

  const steps = [t("landing.step1"), t("landing.step2"), t("landing.step3")];

  return (
    <main className="min-h-screen bg-deep text-soft">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_38%)]" />
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl content-center gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan">KTG Signage</p>
              <LanguageSwitcher />
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">{t("landing.heroTitle")}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">{t("landing.heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button>
                  {t("landing.startFree")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">{t("landing.login")}</Button>
              </Link>
            </div>
          </div>
          <div className="grid content-end">
            <div className="rounded-lg border border-slate-700 bg-black/40 p-4 shadow-glow backdrop-blur">
              <div className="aspect-video overflow-hidden rounded-md bg-surface">
                <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#111827,#0B0F19_45%,#2563EB)] p-8 text-center">
                  <PlayCircle className="mx-auto mb-5 h-16 w-16 text-cyan" />
                  <h2 className="text-3xl font-semibold">{t("landing.demoTitle")}</h2>
                  <p className="mt-3 text-slate-200">{t("landing.demoSubtitle")}</p>
                </div>
              </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <span className="rounded-md bg-surface p-3">{t("landing.lobbyOnline")}</span>
                <span className="rounded-md bg-surface p-3">{t("landing.sanctuaryOnline")}</span>
                <span className="rounded-md bg-surface p-3">{t("landing.hallOffline")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title}>
                <Icon className="mb-4 h-6 w-6 text-cyan" />
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{feature.text}</p>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-800 bg-surface">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-3 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold">{t("landing.builtForTitle")}</h2>
            <p className="mt-4 text-slate-400">{t("landing.builtForText")}</p>
          </div>
          <div className="lg:col-span-2 grid gap-4 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-slate-700 p-5">
                <span className="text-sm text-cyan">0{index + 1}</span>
                <h3 className="mt-3 font-semibold">{step}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
