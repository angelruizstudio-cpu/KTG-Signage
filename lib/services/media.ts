import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { withTimeout } from "@/lib/utils/timeout";
import type { MediaAsset, MediaType } from "@/types/signage";

const allowedTypes: Record<string, { type: MediaType; maxSize: number }> = {
  "image/jpeg": { type: "image", maxSize: 10 * 1024 * 1024 },
  "image/png": { type: "image", maxSize: 10 * 1024 * 1024 },
  "image/webp": { type: "image", maxSize: 10 * 1024 * 1024 },
  "video/mp4": { type: "video", maxSize: 250 * 1024 * 1024 },
  "video/webm": { type: "video", maxSize: 250 * 1024 * 1024 }
};

export async function listMediaAssets(supabase: SupabaseClient<Database>, organizationId: string) {
  const { data, error } = await withTimeout(
    supabase
      .from("media_assets")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    "Supabase media request timed out."
  );
  if (error) throw error;
  return data as MediaAsset[];
}

export async function uploadMediaAsset(
  supabase: SupabaseClient<Database>,
  file: File,
  organizationId: string,
  description?: string
) {
  const rule = allowedTypes[file.type];
  if (!rule) throw new Error("Unsupported file type.");
  if (file.size > rule.maxSize) throw new Error(rule.type === "image" ? "Images are limited to 10 MB." : "Videos are limited to 250 MB.");

  const {
    data: { user }
  } = await supabase.auth.getUser();
  const mediaAssetId = crypto.randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const storagePath = `${organizationId}/${mediaAssetId}/${safeName}`;

  const { error: uploadError } = await supabase.storage.from("signage-media").upload(storagePath, file, {
    contentType: file.type,
    upsert: false
  });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from("signage-media").getPublicUrl(storagePath);
  // MVP uses public URLs for player reliability. Move to signed URLs when device auth is added.
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      id: mediaAssetId,
      organization_id: organizationId,
      uploaded_by: user?.id ?? null,
      title: file.name.replace(/\.[^.]+$/, ""),
      description: description || null,
      file_url: publicUrl.publicUrl,
      storage_path: storagePath,
      media_type: rule.type,
      mime_type: file.type,
      file_size: file.size
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as MediaAsset;
}

export async function updateMediaAsset(
  supabase: SupabaseClient<Database>,
  id: string,
  values: Partial<Pick<MediaAsset, "title" | "description" | "is_active">>
) {
  if (values.title !== undefined && !values.title.trim()) throw new Error("Media title is required.");
  const { data, error } = await supabase.from("media_assets").update(values).eq("id", id).select("*").single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteMediaAsset(supabase: SupabaseClient<Database>, asset: MediaAsset) {
  // Delete the row first: if the file were removed first and the row delete
  // failed, playlists would keep items pointing at a broken URL.
  const { error } = await supabase.from("media_assets").delete().eq("id", asset.id);
  if (error) throw error;
  const { error: storageError } = await supabase.storage.from("signage-media").remove([asset.storage_path]);
  if (storageError) console.warn("Media row deleted but storage cleanup failed", storageError);
}



