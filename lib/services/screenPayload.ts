import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";
import type { ScreenPayload } from "@/types/signage";

export async function getScreenPayload(supabase: SupabaseClient<Database>, screenKey: string) {
  const { data, error } = await supabase.rpc("get_screen_payload", { screen_key_input: screenKey });
  if (error) throw error;
  return data as ScreenPayload;
}

export async function updateScreenHeartbeat(supabase: SupabaseClient<Database>, screenKey: string) {
  const { error } = await supabase.rpc("update_screen_heartbeat", { screen_key_input: screenKey });
  if (error) throw error;
}

export async function logScreenEvent(
  supabase: SupabaseClient<Database>,
  screenId: string,
  eventType: string,
  message?: string,
  metadata?: Json
) {
  await supabase.from("screen_events").insert({
    screen_id: screenId,
    event_type: eventType,
    message: message ?? null,
    metadata: metadata ?? null
  });
}
