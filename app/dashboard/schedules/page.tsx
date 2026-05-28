"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { createClient } from "@/lib/supabase/client";
import { useCurrentOrganization } from "@/lib/hooks/useCurrentOrganization";
import { listPlaylists } from "@/lib/services/playlists";
import { listScreens } from "@/lib/services/screens";
import { deleteSchedule, listSchedules, upsertSchedule } from "@/lib/services/schedules";
import type { Playlist, Schedule, Screen } from "@/types/signage";

const defaultDays = [0, 1, 2, 3, 4, 5, 6];

export default function SchedulesPage() {
  const { organization } = useCurrentOrganization();
  const supabase = createClient();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    screen_id: "",
    playlist_id: "",
    starts_at: "",
    ends_at: "",
    start_time: "",
    end_time: "",
    priority: 0,
    is_active: true
  });

  async function load() {
    if (!organization) return;
    setLoading(true);
    const [nextSchedules, nextScreens, nextPlaylists] = await Promise.all([
      listSchedules(supabase, organization.id),
      listScreens(supabase, organization.id),
      listPlaylists(supabase, organization.id)
    ]);
    setSchedules(nextSchedules);
    setScreens(nextScreens);
    setPlaylists(nextPlaylists.filter((playlist) => playlist.is_active));
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [organization]);

  if (loading) return <LoadingState label="Loading schedules" />;

  return (
    <>
      <PageHeader title="Schedules" description="Schedules override normal playlist assignment. Highest priority wins, then most recent." />
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Create schedule</h2>
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!organization) return;
              await upsertSchedule(supabase, {
                organization_id: organization.id,
                screen_id: form.screen_id || null,
                playlist_id: form.playlist_id,
                name: form.name,
                starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
                ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
                days_of_week: defaultDays,
                start_time: form.start_time || null,
                end_time: form.end_time || null,
                priority: Number(form.priority),
                is_active: form.is_active
              });
              setForm({ name: "", screen_id: "", playlist_id: "", starts_at: "", ends_at: "", start_time: "", end_time: "", priority: 0, is_active: true });
              await load();
            }}
          >
            <Input placeholder="Schedule name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            <Select value={form.screen_id} onChange={(event) => setForm({ ...form, screen_id: event.target.value })}>
              <option value="">All screens</option>
              {screens.map((screen) => <option key={screen.id} value={screen.id}>{screen.name}</option>)}
            </Select>
            <Select value={form.playlist_id} onChange={(event) => setForm({ ...form, playlist_id: event.target.value })} required>
              <option value="">Select playlist</option>
              {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
            </Select>
            <Input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
            <Input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="time" value={form.start_time} onChange={(event) => setForm({ ...form, start_time: event.target.value })} />
              <Input type="time" value={form.end_time} onChange={(event) => setForm({ ...form, end_time: event.target.value })} />
            </div>
            <Input type="number" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} placeholder="Priority" />
            <Select value={form.is_active ? "active" : "inactive"} onChange={(event) => setForm({ ...form, is_active: event.target.value === "active" })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Button>Create schedule</Button>
          </form>
        </Card>
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{schedule.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">Priority {schedule.priority}</p>
                </div>
                <Badge tone={schedule.is_active ? "success" : "neutral"}>{schedule.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await upsertSchedule(supabase, { ...schedule, is_active: !schedule.is_active });
                    await load();
                  }}
                >
                  {schedule.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="ghost" onClick={async () => { await deleteSchedule(supabase, schedule.id); await load(); }}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
