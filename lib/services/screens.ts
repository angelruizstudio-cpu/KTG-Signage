import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Screen, ScreenOrientation } from "@/types/signage";
import { createScreenKey } from "@/lib/utils/format";

export async function listScreens(supabase: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await supabase
    .from("screens")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Screen[];
}

export async function getScreen(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from("screens").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Screen;
}

export async function createScreen(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  values: { name: string; location?: string; orientation: ScreenOrientation; current_playlist_id?: string | null }
) {
  if (!values.name.trim()) throw new Error("Screen name is required.");

  const { data, error } = await supabase
    .from("screens")
    .insert({
      organization_id: organizationId,
      name: values.name.trim(),
      location: values.location || null,
      orientation: values.orientation,
      current_playlist_id: values.current_playlist_id ?? null,
      screen_key: createScreenKey(values.name)
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Screen;
}

export async function updateScreen(
  supabase: SupabaseClient<Database>,
  id: string,
  values: Partial<Pick<Screen, "name" | "location" | "orientation" | "current_playlist_id" | "status" | "screen_key">>
) {
  if (values.name !== undefined && !values.name.trim()) throw new Error("Screen name is required.");
  const { data, error } = await supabase.from("screens").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Screen;
}

export async function deleteScreen(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from("screens").delete().eq("id", id);
  if (error) throw error;
}

export async function regenerateScreenKey(supabase: SupabaseClient<Database>, screen: Screen) {
  const screen_key = createScreenKey(screen.name);
  return updateScreen(supabase, screen.id, { screen_key } as Partial<Screen>);
}

export async function assignPlaylistToScreen(
  supabase: SupabaseClient<Database>,
  screenId: string,
  playlistId: string | null
) {
  if (!playlistId) {
    const { error: clearLinkError } = await supabase.from("screen_playlists").delete().eq("screen_id", screenId);
    if (clearLinkError) throw clearLinkError;
    const { error } = await supabase.from("screens").update({ current_playlist_id: null }).eq("id", screenId);
    if (error) throw error;
    return;
  }

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .select("id,is_active")
    .eq("id", playlistId)
    .single();
  if (playlistError) throw playlistError;
  if (!playlist.is_active) throw new Error("Inactive playlists cannot be assigned to screens.");

  const { error: clearLinkError } = await supabase.from("screen_playlists").delete().eq("screen_id", screenId);
  if (clearLinkError) throw clearLinkError;

  const { error: linkError } = await supabase.from("screen_playlists").insert({
    screen_id: screenId,
    playlist_id: playlistId
  });
  if (linkError) throw linkError;

  const { error: screenError } = await supabase
    .from("screens")
    .update({ current_playlist_id: playlistId })
    .eq("id", screenId);
  if (screenError) throw screenError;
}
