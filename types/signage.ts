export type Role = "owner" | "admin" | "editor" | "viewer";
export type ScreenStatus = "online" | "offline" | "maintenance";
export type ScreenOrientation = "landscape" | "portrait";
export type MediaType = "image" | "video";
export type DeviceStatus = "pending" | "paired" | "revoked";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Screen {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  screen_key: string;
  status: ScreenStatus;
  orientation: ScreenOrientation;
  current_playlist_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  organization_id: string;
  uploaded_by: string | null;
  title: string;
  description: string | null;
  file_url: string;
  storage_path: string;
  media_type: MediaType;
  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_asset_id: string;
  sort_order: number;
  display_duration_seconds: number;
  transition_type: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ScreenPlaylist {
  id: string;
  screen_id: string;
  playlist_id: string;
  is_active: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  organization_id: string;
  screen_id: string | null;
  playlist_id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignageDevice {
  id: string;
  organization_id: string | null;
  screen_id: string | null;
  device_key: string;
  pairing_code: string;
  pairing_expires_at: string;
  status: DeviceStatus;
  name: string | null;
  user_agent: string | null;
  last_seen_at: string | null;
  paired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceAssignment {
  device: Pick<
    SignageDevice,
    "id" | "organization_id" | "screen_id" | "status" | "name" | "last_seen_at" | "pairing_code" | "pairing_expires_at"
  > | null;
  screen: Pick<Screen, "id" | "screen_key" | "name"> | null;
  payload: ScreenPayload | null;
}

export interface ScreenPayloadItem {
  id: string;
  playlist_id: string;
  media_asset_id: string;
  sort_order: number;
  display_duration_seconds: number;
  transition_type: string | null;
  is_active: boolean;
  media_asset: Pick<
    MediaAsset,
    | "id"
    | "title"
    | "description"
    | "file_url"
    | "media_type"
    | "mime_type"
    | "duration_seconds"
    | "width"
    | "height"
  >;
}

export interface ScreenPayload {
  screen: Pick<
    Screen,
    | "id"
    | "organization_id"
    | "name"
    | "location"
    | "screen_key"
    | "status"
    | "orientation"
    | "current_playlist_id"
    | "last_seen_at"
  > | null;
  playlist: Pick<Playlist, "id" | "organization_id" | "name" | "description" | "is_active"> | null;
  items: ScreenPayloadItem[];
}

export interface DashboardStats {
  totalScreens: number;
  onlineScreens: number;
  offlineScreens: number;
  totalMediaAssets: number;
  totalPlaylists: number;
  activeSchedules: number;
}
