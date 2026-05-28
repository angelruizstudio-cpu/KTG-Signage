export const realtimeTables = [
  "screens",
  "screen_playlists",
  "playlists",
  "playlist_items",
  "media_assets",
  "schedules"
] as const;

export type RealtimeTable = (typeof realtimeTables)[number];
