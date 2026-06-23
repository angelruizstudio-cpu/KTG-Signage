import type {
  MediaAsset,
  Organization,
  OrganizationMember,
  Playlist,
  PlaylistItem,
  Schedule,
  Screen,
  ScreenPayload,
  ScreenPlaylist,
  SignageDevice,
  DeviceAssignment
} from "./signage";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type WriteShape<T> = Partial<T> & Record<string, unknown>;
type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<T, Insert = WriteShape<T>, Update = WriteShape<T>> = {
  Row: T & Record<string, unknown>;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export interface Database {
  public: {
    Tables: {
      organizations: Table<Organization>;
      profiles: Table<import("./signage").Profile>;
      organization_members: Table<OrganizationMember>;
      screens: Table<Screen>;
      media_assets: Table<MediaAsset>;
      playlists: Table<Playlist>;
      playlist_items: Table<PlaylistItem>;
      screen_playlists: Table<ScreenPlaylist>;
      schedules: Table<Schedule>;
      signage_devices: Table<SignageDevice>;
      screen_update_signals: Table<{
        screen_id: string;
        screen_key: string;
        organization_id: string;
        reason: string;
        version: number;
        updated_at: string;
      }>;
      screen_events: Table<{
        id: string;
        screen_id: string;
        event_type: string;
        message: string | null;
        metadata: Json | null;
        notified_at: string | null;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      get_screen_payload: {
        Args: { screen_key_input: string };
        Returns: ScreenPayload;
      };
      update_screen_heartbeat: {
        Args: { screen_key_input: string };
        Returns: void;
      };
      mark_stale_screens_offline: {
        Args: Record<string, never>;
        Returns: number;
      };
      start_device_pairing: {
        Args: { user_agent_input?: string | null };
        Returns: {
          device_id: string;
          device_key: string;
          pairing_code: string;
          expires_at: string;
        };
      };
      pair_signage_device: {
        Args: { pairing_code_input: string; screen_id_input: string; device_name_input?: string | null };
        Returns: {
          device_id: string;
          screen_id: string;
          status: string;
          name: string | null;
        };
      };
      get_device_assignment: {
        Args: { device_key_input: string };
        Returns: DeviceAssignment;
      };
      update_device_heartbeat: {
        Args: { device_key_input: string };
        Returns: void;
      };
      bootstrap_organization: {
        Args: { full_name_input: string; organization_name_input: string };
        Returns: {
          organization_id: string;
          playlist_id?: string;
          already_exists: boolean;
        };
      };
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      has_org_role: {
        Args: { org_id: string; allowed_roles: string[] };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
