import Link from "next/link";
import { ArrowRight, CalendarClock, Monitor, PlayCircle, Upload, Wifi } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const features = [
  { icon: Wifi, title: "Realtime updates", text: "Screens refresh automatically when playlists, schedules, or media change." },
  { icon: Monitor, title: "Unlimited screens", text: "Start with three church displays and keep adding more as your ministry grows." },
  { icon: Upload, title: "Media library", text: "Upload announcement graphics, videos, giving QR slides, and welcome loops." },
  { icon: CalendarClock, title: "Scheduling", text: "Prioritize content by date, day of week, time window, and screen." }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-deep text-soft">
      <section className="relative overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.18),transparent_35%),radial-gradient(circle_at_top_left,rgba(37,99,235,0.24),transparent_38%)]" />
        <div className="relative mx-auto grid min-h-[88vh] max-w-7xl content-center gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-cyan">KTG Signage</p>
            <h1 className="max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">Church displays updated in real time.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              KTG Signage helps churches manage announcements, events, welcome screens, giving QR codes, and media loops across multiple displays in real time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button>
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="secondary">Login</Button>
              </Link>
            </div>
          </div>
          <div className="grid content-end">
            <div className="rounded-lg border border-slate-700 bg-black/40 p-4 shadow-glow backdrop-blur">
              <div className="aspect-video overflow-hidden rounded-md bg-surface">
                <div className="grid h-full place-items-center bg-[linear-gradient(135deg,#111827,#0B0F19_45%,#2563EB)] p-8 text-center">
                  <PlayCircle className="mx-auto mb-5 h-16 w-16 text-cyan" />
                  <h2 className="text-3xl font-semibold">Welcome Loop</h2>
                  <p className="mt-3 text-slate-200">Sunday service starts at 10:30 AM</p>
                </div>
              </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                <span className="rounded-md bg-surface p-3">Lobby online</span>
                <span className="rounded-md bg-surface p-3">Sanctuary online</span>
                <span className="rounded-md bg-surface p-3">Hall offline</span>
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
            <h2 className="text-3xl font-semibold">Built for church rhythms</h2>
            <p className="mt-4 text-slate-400">Sunday announcements, midweek events, lobby welcomes, children ministry notices, and giving QR codes stay synchronized without touching every device.</p>
          </div>
          <div className="lg:col-span-2 grid gap-4 md:grid-cols-3">
            {["Open pairing page", "Enter code", "Assign screen"].map((step, index) => (
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
