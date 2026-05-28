create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  primary_color text default '#2563EB',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz default now(),
  unique (organization_id, user_id)
);

create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  location text,
  screen_key text unique not null,
  status text default 'offline' check (status in ('online', 'offline', 'maintenance')),
  orientation text default 'landscape' check (orientation in ('landscape', 'portrait')),
  current_playlist_id uuid,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  title text not null,
  description text,
  file_url text not null,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  mime_type text,
  file_size bigint,
  duration_seconds integer,
  width integer,
  height integer,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  sort_order integer not null default 0,
  display_duration_seconds integer default 10,
  transition_type text default 'fade',
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.screen_playlists (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens(id) on delete cascade,
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (screen_id, playlist_id)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  screen_id uuid references public.screens(id) on delete cascade,
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  name text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  days_of_week integer[],
  start_time time,
  end_time time,
  priority integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.screen_events (
  id uuid primary key default gen_random_uuid(),
  screen_id uuid not null references public.screens(id) on delete cascade,
  event_type text not null,
  message text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.screens
  add constraint screens_current_playlist_id_fkey
  foreign key (current_playlist_id)
  references public.playlists(id)
  on delete set null;

create index if not exists idx_organization_members_org on public.organization_members(organization_id);
create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_screens_org on public.screens(organization_id);
create index if not exists idx_screens_key on public.screens(screen_key);
create index if not exists idx_screens_playlist on public.screens(current_playlist_id);
create index if not exists idx_screens_status_seen on public.screens(status, last_seen_at);
create index if not exists idx_media_assets_org on public.media_assets(organization_id);
create index if not exists idx_media_assets_active on public.media_assets(organization_id, is_active);
create index if not exists idx_playlists_org on public.playlists(organization_id);
create index if not exists idx_playlists_active on public.playlists(organization_id, is_active);
create index if not exists idx_playlist_items_playlist on public.playlist_items(playlist_id, sort_order);
create index if not exists idx_playlist_items_media on public.playlist_items(media_asset_id);
create index if not exists idx_screen_playlists_screen on public.screen_playlists(screen_id);
create index if not exists idx_screen_playlists_playlist on public.screen_playlists(playlist_id);
create index if not exists idx_schedules_org on public.schedules(organization_id);
create index if not exists idx_schedules_screen on public.schedules(screen_id);
create index if not exists idx_schedules_playlist on public.schedules(playlist_id);
create index if not exists idx_schedules_active_window on public.schedules(is_active, starts_at, ends_at, priority);
create index if not exists idx_screen_events_screen on public.screen_events(screen_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger screens_set_updated_at
before update on public.screens
for each row execute function public.set_updated_at();

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

create trigger playlists_set_updated_at
before update on public.playlists
for each row execute function public.set_updated_at();

create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function public.set_updated_at();
