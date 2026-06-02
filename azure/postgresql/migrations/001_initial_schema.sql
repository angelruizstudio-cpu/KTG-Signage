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
  id uuid primary key default gen_random_uuid(),
  external_auth_provider text default 'local',
  external_auth_user_id text unique,
  full_name text,
  email text unique,
  avatar_url text,
  password_hash text,
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

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.screens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  location text,
  screen_key text unique not null,
  status text default 'offline' check (status in ('online', 'offline', 'maintenance')),
  orientation text default 'landscape' check (orientation in ('landscape', 'portrait')),
  current_playlist_id uuid references public.playlists(id) on delete set null,
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

create table if not exists public.signage_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  screen_id uuid references public.screens(id) on delete set null,
  device_key text unique not null,
  pairing_code text unique not null,
  pairing_expires_at timestamptz not null default (now() + interval '15 minutes'),
  status text not null default 'pending' check (status in ('pending', 'paired', 'revoked')),
  name text,
  user_agent text,
  last_seen_at timestamptz,
  paired_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.screen_update_signals (
  screen_id uuid primary key references public.screens(id) on delete cascade,
  screen_key text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reason text not null default 'content_changed',
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists idx_organization_members_org on public.organization_members(organization_id);
create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_screens_org on public.screens(organization_id);
create index if not exists idx_screens_key on public.screens(screen_key);
create index if not exists idx_screens_playlist on public.screens(current_playlist_id);
create index if not exists idx_screens_status_seen on public.screens(status, last_seen_at);
create index if not exists idx_media_assets_org on public.media_assets(organization_id);
create index if not exists idx_media_assets_active on public.media_assets(organization_id, is_active);
create index if not exists idx_playlists_org on public.playlists(organization_id);
create index if not exists idx_playlist_items_playlist on public.playlist_items(playlist_id, sort_order);
create index if not exists idx_playlist_items_media on public.playlist_items(media_asset_id);
create index if not exists idx_screen_playlists_screen on public.screen_playlists(screen_id);
create index if not exists idx_screen_playlists_playlist on public.screen_playlists(playlist_id);
create index if not exists idx_schedules_org on public.schedules(organization_id);
create index if not exists idx_schedules_screen on public.schedules(screen_id);
create index if not exists idx_schedules_playlist on public.schedules(playlist_id);
create index if not exists idx_screen_events_screen on public.screen_events(screen_id, created_at desc);
create index if not exists idx_signage_devices_org on public.signage_devices(organization_id);
create index if not exists idx_signage_devices_screen on public.signage_devices(screen_id);
create index if not exists idx_signage_devices_key on public.signage_devices(device_key);
create index if not exists idx_signage_devices_code on public.signage_devices(pairing_code);
create index if not exists idx_screen_update_signals_screen_key on public.screen_update_signals(screen_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid;
$$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = public.current_app_user_id()
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = public.current_app_user_id()
      and om.role = any(allowed_roles)
  );
$$;

create or replace function public.get_screen_payload(screen_key_input text)
returns jsonb
language plpgsql
stable
as $$
declare
  screen_record public.screens%rowtype;
  playlist_record public.playlists%rowtype;
  schedule_playlist_id uuid;
  assigned_playlist_id uuid;
begin
  select * into screen_record
  from public.screens
  where screen_key = screen_key_input
  limit 1;

  if not found then
    return jsonb_build_object('screen', null, 'playlist', null, 'items', '[]'::jsonb);
  end if;

  select sc.playlist_id into schedule_playlist_id
  from public.schedules sc
  join public.playlists p on p.id = sc.playlist_id
  where sc.organization_id = screen_record.organization_id
    and sc.is_active = true
    and p.is_active = true
    and (sc.screen_id is null or sc.screen_id = screen_record.id)
    and (sc.starts_at is null or sc.starts_at <= now())
    and (sc.ends_at is null or sc.ends_at >= now())
    and (sc.days_of_week is null or extract(dow from now())::int = any(sc.days_of_week))
    and (sc.start_time is null or localtime >= sc.start_time)
    and (sc.end_time is null or localtime <= sc.end_time)
  order by sc.priority desc, sc.created_at desc
  limit 1;

  if schedule_playlist_id is not null then
    select * into playlist_record
    from public.playlists
    where id = schedule_playlist_id
      and organization_id = screen_record.organization_id
      and is_active = true;
  else
    select sp.playlist_id into assigned_playlist_id
    from public.screen_playlists sp
    join public.playlists p on p.id = sp.playlist_id
    where sp.screen_id = screen_record.id
      and sp.is_active = true
      and p.is_active = true
    order by sp.created_at desc
    limit 1;

    if assigned_playlist_id is not null then
      select * into playlist_record
      from public.playlists
      where id = assigned_playlist_id
        and organization_id = screen_record.organization_id
        and is_active = true;
    elsif screen_record.current_playlist_id is not null then
      select * into playlist_record
      from public.playlists
      where id = screen_record.current_playlist_id
        and organization_id = screen_record.organization_id
        and is_active = true;
    end if;
  end if;

  return jsonb_build_object(
    'screen', jsonb_build_object(
      'id', screen_record.id,
      'organization_id', screen_record.organization_id,
      'name', screen_record.name,
      'location', screen_record.location,
      'screen_key', screen_record.screen_key,
      'status', screen_record.status,
      'orientation', screen_record.orientation,
      'current_playlist_id', screen_record.current_playlist_id,
      'last_seen_at', screen_record.last_seen_at
    ),
    'playlist', case
      when playlist_record.id is null then null
      else jsonb_build_object(
        'id', playlist_record.id,
        'organization_id', playlist_record.organization_id,
        'name', playlist_record.name,
        'description', playlist_record.description,
        'is_active', playlist_record.is_active
      )
    end,
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'playlist_id', pi.playlist_id,
          'media_asset_id', ma.id,
          'sort_order', pi.sort_order,
          'display_duration_seconds', coalesce(pi.display_duration_seconds, 10),
          'transition_type', pi.transition_type,
          'is_active', pi.is_active,
          'media_asset', jsonb_build_object(
            'id', ma.id,
            'title', ma.title,
            'description', ma.description,
            'file_url', ma.file_url,
            'media_type', ma.media_type,
            'mime_type', ma.mime_type,
            'duration_seconds', ma.duration_seconds,
            'width', ma.width,
            'height', ma.height
          )
        )
        order by pi.sort_order asc, pi.created_at asc
      )
      from public.playlist_items pi
      join public.media_assets ma on ma.id = pi.media_asset_id
      where pi.playlist_id = playlist_record.id
        and pi.is_active = true
        and ma.is_active = true
    ), '[]'::jsonb)
  );
end;
$$;
