import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Schedule } from "@/types/signage";

export async function listSchedules(supabase: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("organization_id", organizationId)
    .order("priority", { ascending: false });
  if (error) throw error;
  return data as Schedule[];
}

export async function upsertSchedule(
  supabase: SupabaseClient<Database>,
  values: Omit<Schedule, "id" | "created_at" | "updated_at"> & { id?: string }
) {
  if (!values.name.trim()) throw new Error("Schedule name is required.");
  const { data, error } = await supabase.from("schedules").upsert(values).select("*").single();
  if (error) throw error;
  return data as Schedule;
}

export async function deleteSchedule(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}
