import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { DeviceAssignment, SignageDevice } from "@/types/signage";

export async function startDevicePairing(supabase: SupabaseClient<Database>, userAgent?: string) {
  const { data, error } = await supabase.rpc("start_device_pairing", {
    user_agent_input: userAgent ?? null
  });
  if (error) throw error;
  return data;
}

export async function pairSignageDevice(
  supabase: SupabaseClient<Database>,
  pairingCode: string,
  screenId: string,
  deviceName?: string
) {
  const { data, error } = await supabase.rpc("pair_signage_device", {
    pairing_code_input: pairingCode.trim().toUpperCase(),
    screen_id_input: screenId,
    device_name_input: deviceName || null
  });
  if (error) throw error;
  return data;
}

export async function getDeviceAssignment(supabase: SupabaseClient<Database>, deviceKey: string) {
  const { data, error } = await supabase.rpc("get_device_assignment", {
    device_key_input: deviceKey
  });
  if (error) throw error;
  return data as DeviceAssignment;
}

export async function updateDeviceHeartbeat(supabase: SupabaseClient<Database>, deviceKey: string) {
  const { error } = await supabase.rpc("update_device_heartbeat", {
    device_key_input: deviceKey
  });
  if (error) throw error;
}

export async function listSignageDevices(supabase: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await supabase
    .from("signage_devices")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as SignageDevice[];
}

export async function revokeSignageDevice(supabase: SupabaseClient<Database>, deviceId: string) {
  const { error } = await supabase.from("signage_devices").update({ status: "revoked" }).eq("id", deviceId);
  if (error) throw error;
}

export async function assignDeviceToScreen(supabase: SupabaseClient<Database>, deviceId: string, screenId: string) {
  const { data: screen, error: screenError } = await supabase
    .from("screens")
    .select("organization_id")
    .eq("id", screenId)
    .single();
  if (screenError) throw screenError;

  const { error } = await supabase
    .from("signage_devices")
    .update({ screen_id: screenId, organization_id: screen.organization_id, status: "paired" })
    .eq("id", deviceId);
  if (error) throw error;
}
