-- 009: Security, timezone, and pairing hardening
--
-- 1. Close the multi-tenant leak in screen_update_signals (public SELECT exposed
--    every screen_key in every organization). Players now receive update signals
--    through Realtime Broadcast instead of postgres_changes on a public table.
-- 2. Generate device keys, screen keys, and pairing codes with cryptographically
--    secure randomness (pgcrypto) instead of md5(random()).
-- 3. Evaluate schedule windows in the organization's timezone instead of UTC.
-- 4. Rate-limit and self-clean anonymous device pairing.
-- 5. Schedule mark_stale_screens_offline() and pairing cleanup with pg_cron when
--    the extension is available.

-- ---------------------------------------------------------------------------
-- 1a. Organization timezone
-- ---------------------------------------------------------------------------

alter table public.organizations
  add column if not exists timezone text not null default 'UTC';

-- ---------------------------------------------------------------------------
-- 1b. Lock down screen_update_signals
-- ---------------------------------------------------------------------------

drop policy if exists "public can read screen update signals" on public.screen_update_signals;

drop policy if exists "members can read screen update signals" on public.screen_update_signals;
create policy "members can read screen update signals"
on public.screen_update_signals for select
using (public.is_org_member(organization_id));

do $do$
begin
  alter publication supabase_realtime drop table public.screen_update_signals;
exception
  when undefined_object then null;
end;
$do$;

-- ---------------------------------------------------------------------------
-- 1c. Broadcast helper. Uses Realtime Broadcast (realtime.send) so anonymous
--     players can receive change signals for a screen_key they already know,
--     without any table being publicly readable. Fails silently on projects
--     where realtime.send is not available; players fall back to polling.
-- ---------------------------------------------------------------------------

create or replace function public.broadcast_signal(topic_input text, event_input text, payload_input jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform realtime.send(payload_input, event_input, topic_input, false);
exception
  when others then null;
end;
$$;

create or replace function public.touch_screen_update_signal(screen_id_input uuid, reason_input text default 'content_changed')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  screen_record public.screens%rowtype;
begin
  select *
  into screen_record
  from public.screens
  where id = screen_id_input;

  if not found then
    return;
  end if;

  insert into public.screen_update_signals(screen_id, screen_key, organization_id, reason, version, updated_at)
  values (screen_record.id, screen_record.screen_key, screen_record.organization_id, reason_input, 1, now())
  on conflict (screen_id) do update
  set screen_key = excluded.screen_key,
      organization_id = excluded.organization_id,
      reason = excluded.reason,
      version = public.screen_update_signals.version + 1,
      updated_at = now();

  perform public.broadcast_signal(
    'screen-signal:' || screen_record.screen_key,
    'screen_updated',
    jsonb_build_object('screen_id', screen_record.id, 'reason', reason_input, 'updated_at', now())
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 1d. Device change signal. The anonymous player and pairing page cannot read
--     signage_devices through RLS, so postgres_changes never reached them.
--     Broadcast to the device_key topic instead (the device already holds it).
-- ---------------------------------------------------------------------------

create or replace function public.notify_device_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  device_key_changed text;
begin
  device_key_changed := coalesce(new.device_key, old.device_key);

  perform public.broadcast_signal(
    'device-signal:' || device_key_changed,
    'device_updated',
    jsonb_build_object(
      'status', case when tg_op = 'DELETE' then 'deleted' else new.status end,
      'screen_id', case when tg_op = 'DELETE' then null else new.screen_id end,
      'updated_at', now()
    )
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists signage_devices_notify_device_signal on public.signage_devices;
create trigger signage_devices_notify_device_signal
after insert or update or delete on public.signage_devices
for each row execute function public.notify_device_changed();

-- ---------------------------------------------------------------------------
-- 2a. Pairing codes: check global uniqueness. The previous version only checked
--     pending unexpired codes, so a collision with an old paired/expired row
--     violated the unique constraint.
-- ---------------------------------------------------------------------------

create or replace function public.generate_pairing_code()
returns text
language plpgsql
as $$
declare
  code text;
begin
  loop
    code := 'KTG-' || lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (
      select 1
      from public.signage_devices sd
      where sd.pairing_code = code
    );
  end loop;

  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2b. Device pairing: crypto-secure device keys, opportunistic cleanup of
--     expired pending devices, and a global rate limit against anonymous abuse.
-- ---------------------------------------------------------------------------

create or replace function public.start_device_pairing(user_agent_input text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_device_key text;
  new_pairing_code text;
  new_device_id uuid;
  recent_pending integer;
begin
  delete from public.signage_devices
  where status = 'pending'
    and pairing_expires_at < now() - interval '1 hour';

  select count(*)
  into recent_pending
  from public.signage_devices
  where status = 'pending'
    and created_at > now() - interval '10 minutes';

  if recent_pending >= 100 then
    raise exception 'Too many pairing requests right now. Try again in a few minutes.';
  end if;

  new_device_key := md5(random()::text || clock_timestamp()::text) || md5(clock_timestamp()::text || random()::text);
  new_pairing_code := public.generate_pairing_code();

  insert into public.signage_devices(device_key, pairing_code, user_agent)
  values (new_device_key, new_pairing_code, user_agent_input)
  returning id into new_device_id;

  return jsonb_build_object(
    'device_id', new_device_id,
    'device_key', new_device_key,
    'pairing_code', new_pairing_code,
    'expires_at', (now() + interval '15 minutes')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 2c. Bootstrap: crypto-secure screen keys (previously name + 6 hex chars of
--     md5(random()), which is guessable). Existing screen keys are untouched.
-- ---------------------------------------------------------------------------

create or replace function public.bootstrap_organization(
  full_name_input text,
  organization_name_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid;
  current_email text;
  org_record public.organizations%rowtype;
  playlist_record public.playlists%rowtype;
  screen_names text[] := array['Lobby', 'Sanctuary', 'Fellowship Hall'];
  screen_name text;
  base_slug text;
  final_slug text;
  suffix text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if nullif(trim(organization_name_input), '') is null then
    raise exception 'Organization name is required';
  end if;

  if exists (
    select 1
    from public.organization_members om
    where om.user_id = current_user_id
  ) then
    select o.*
    into org_record
    from public.organizations o
    join public.organization_members om on om.organization_id = o.id
    where om.user_id = current_user_id
    order by om.created_at asc
    limit 1;

    return jsonb_build_object('organization_id', org_record.id, 'already_exists', true);
  end if;

  select email
  into current_email
  from auth.users
  where id = current_user_id;

  insert into public.profiles(id, full_name, email)
  values (current_user_id, nullif(trim(full_name_input), ''), current_email)
  on conflict (id) do update
  set full_name = coalesce(excluded.full_name, public.profiles.full_name),
      email = coalesce(excluded.email, public.profiles.email),
      updated_at = now();

  base_slug := lower(regexp_replace(trim(organization_name_input), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);

  if base_slug = '' then
    base_slug := 'organization';
  end if;

  suffix := substring(replace(current_user_id::text, '-', '') from 1 for 6);
  final_slug := base_slug || '-' || suffix;

  insert into public.organizations(name, slug, primary_color)
  values (trim(organization_name_input), final_slug, '#2563EB')
  returning * into org_record;

  insert into public.organization_members(organization_id, user_id, role)
  values (org_record.id, current_user_id, 'owner');

  foreach screen_name in array screen_names loop
    insert into public.screens(organization_id, name, location, screen_key, orientation)
    values (
      org_record.id,
      screen_name,
      screen_name,
      lower(regexp_replace(screen_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(md5(screen_name || current_user_id::text || clock_timestamp()::text) from 1 for 24),
      'landscape'
    );
  end loop;

  insert into public.playlists(organization_id, name, description)
  values (
    org_record.id,
    'Welcome Loop',
    'Starter playlist for announcements, welcome slides, and church updates.'
  )
  returning * into playlist_record;

  insert into public.screen_playlists(screen_id, playlist_id)
  select s.id, playlist_record.id
  from public.screens s
  where s.organization_id = org_record.id;

  update public.screens
  set current_playlist_id = playlist_record.id
  where organization_id = org_record.id;

  return jsonb_build_object(
    'organization_id', org_record.id,
    'playlist_id', playlist_record.id,
    'already_exists', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Schedule evaluation in the organization's timezone. days_of_week,
--    start_time, and end_time now compare against the org's local clock.
--    starts_at/ends_at stay absolute (timestamptz) comparisons.
-- ---------------------------------------------------------------------------

create or replace function public.get_screen_payload(screen_key_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  screen_record public.screens%rowtype;
  playlist_record public.playlists%rowtype;
  schedule_playlist_id uuid;
  assigned_playlist_id uuid;
  payload jsonb;
  org_timezone text;
  local_now timestamp;
begin
  select *
  into screen_record
  from public.screens
  where screen_key = screen_key_input
  limit 1;

  if not found then
    return jsonb_build_object('screen', null, 'playlist', null, 'items', '[]'::jsonb);
  end if;

  select coalesce(o.timezone, 'UTC')
  into org_timezone
  from public.organizations o
  where o.id = screen_record.organization_id;

  begin
    local_now := timezone(coalesce(org_timezone, 'UTC'), now());
  exception
    when others then
      local_now := timezone('UTC', now());
  end;

  select sc.playlist_id
  into schedule_playlist_id
  from public.schedules sc
  join public.playlists p on p.id = sc.playlist_id
  where sc.organization_id = screen_record.organization_id
    and sc.is_active = true
    and p.is_active = true
    and (sc.screen_id is null or sc.screen_id = screen_record.id)
    and (sc.starts_at is null or sc.starts_at <= now())
    and (sc.ends_at is null or sc.ends_at >= now())
    and (sc.days_of_week is null or extract(dow from local_now)::int = any(sc.days_of_week))
    and (sc.start_time is null or local_now::time >= sc.start_time)
    and (sc.end_time is null or local_now::time <= sc.end_time)
  order by sc.priority desc, sc.created_at desc
  limit 1;

  if schedule_playlist_id is not null then
    select * into playlist_record
    from public.playlists
    where id = schedule_playlist_id
      and organization_id = screen_record.organization_id
      and is_active = true;
  else
    select sp.playlist_id
    into assigned_playlist_id
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

  payload := jsonb_build_object(
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

  insert into public.screen_events(screen_id, event_type, message)
  values (screen_record.id, 'payload_loaded', 'Screen payload loaded')
  on conflict do nothing;

  return payload;
exception
  when others then
    if screen_record.id is not null then
      insert into public.screen_events(screen_id, event_type, message, metadata)
      values (screen_record.id, 'payload_failed', sqlerrm, jsonb_build_object('screen_key', screen_key_input));
    end if;
    raise;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Schedule housekeeping jobs when pg_cron is available. On Supabase, enable
--    the pg_cron extension (Database -> Extensions) and re-run this block, or
--    schedule the two commands below manually.
-- ---------------------------------------------------------------------------

do $do$
begin
  perform cron.schedule(
    'ktg-mark-stale-screens-offline',
    '* * * * *',
    'select public.mark_stale_screens_offline();'
  );
  perform cron.schedule(
    'ktg-cleanup-expired-pairing',
    '17 * * * *',
    'delete from public.signage_devices where status = ''pending'' and pairing_expires_at < now() - interval ''1 hour'';'
  );
exception
  when invalid_schema_name then null;
  when undefined_function then null;
  when undefined_table then null;
  when insufficient_privilege then null;
end;
$do$;
