import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { MediaAsset, Playlist, PlaylistItem } from "@/types/signage";

export async function listPlaylists(supabase: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Playlist[];
}

export async function getPlaylist(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase.from("playlists").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Playlist;
}

export async function createPlaylist(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  values: { name: string; description?: string | null }
) {
  if (!values.name.trim()) throw new Error("Playlist name is required.");
  const { data, error } = await supabase
    .from("playlists")
    .insert({ organization_id: organizationId, name: values.name.trim(), description: values.description || null })
    .select("*")
    .single();
  if (error) throw error;
  return data as Playlist;
}

export async function updatePlaylist(
  supabase: SupabaseClient<Database>,
  id: string,
  values: Partial<Pick<Playlist, "name" | "description" | "is_active">>
) {
  if (values.name !== undefined && !values.name.trim()) throw new Error("Playlist name is required.");
  const { data, error } = await supabase.from("playlists").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Playlist;
}

export async function deletePlaylist(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from("playlists").delete().eq("id", id);
  if (error) throw error;
}

export async function getPlaylistItems(supabase: SupabaseClient<Database>, playlistId: string) {
  const { data: items, error } = await supabase
    .from("playlist_items")
    .select("*")
    .eq("playlist_id", playlistId)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  const mediaIds = (items ?? []).map((item) => item.media_asset_id);
  if (!mediaIds.length) return [] as Array<PlaylistItem & { media_asset: MediaAsset | null }>;

  const { data: media, error: mediaError } = await supabase.from("media_assets").select("*").in("id", mediaIds);
  if (mediaError) throw mediaError;
  const mediaById = new Map((media as MediaAsset[]).map((asset) => [asset.id, asset]));

  return (items as PlaylistItem[]).map((item) => ({
    ...item,
    media_asset: mediaById.get(item.media_asset_id) ?? null
  }));
}

export async function addMediaToPlaylist(
  supabase: SupabaseClient<Database>,
  playlistId: string,
  mediaAsset: MediaAsset,
  sortOrder: number
) {
  if (!mediaAsset.is_active) throw new Error("Inactive media cannot be added to playlists.");
  const { data, error } = await supabase
    .from("playlist_items")
    .insert({
      playlist_id: playlistId,
      media_asset_id: mediaAsset.id,
      sort_order: sortOrder,
      display_duration_seconds: mediaAsset.media_type === "video" ? 30 : 10
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as PlaylistItem;
}

export async function updatePlaylistItem(
  supabase: SupabaseClient<Database>,
  id: string,
  values: Partial<Pick<PlaylistItem, "sort_order" | "display_duration_seconds" | "is_active">>
) {
  const { data, error } = await supabase.from("playlist_items").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data as PlaylistItem;
}

export async function removePlaylistItem(supabase: SupabaseClient<Database>, id: string) {
  const { error } = await supabase.from("playlist_items").delete().eq("id", id);
  if (error) throw error;
}
