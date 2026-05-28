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
begin
  select *
  into screen_record
  from public.screens
  where screen_key = screen_key_input
  limit 1;

  if not found then
    return jsonb_build_object('screen', null, 'playlist', null, 'items', '[]'::jsonb);
  end if;

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

create or replace function public.update_screen_heartbeat(screen_key_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  screen_id_found uuid;
begin
  update public.screens
  set status = 'online',
      last_seen_at = now(),
      updated_at = now()
  where screen_key = screen_key_input
  returning id into screen_id_found;

  if screen_id_found is not null then
    insert into public.screen_events(screen_id, event_type, message)
    select screen_id_found, 'screen_opened', 'Screen heartbeat opened player'
    where not exists (
      select 1
      from public.screen_events
      where screen_id = screen_id_found
        and event_type = 'screen_opened'
        and created_at > now() - interval '10 minutes'
    );
  end if;
end;
$$;

create or replace function public.mark_stale_screens_offline()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.screens
  set status = 'offline',
      updated_at = now()
  where status = 'online'
    and (last_seen_at is null or last_seen_at < now() - interval '90 seconds');

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.get_screen_payload(text) to anon, authenticated;
grant execute on function public.update_screen_heartbeat(text) to anon, authenticated;
grant execute on function public.mark_stale_screens_offline() to authenticated;

alter table public.screens replica identity full;
alter table public.media_assets replica identity full;
alter table public.playlists replica identity full;
alter table public.playlist_items replica identity full;
alter table public.screen_playlists replica identity full;
alter table public.schedules replica identity full;

alter publication supabase_realtime add table public.screens;
alter publication supabase_realtime add table public.media_assets;
alter publication supabase_realtime add table public.playlists;
alter publication supabase_realtime add table public.playlist_items;
alter publication supabase_realtime add table public.screen_playlists;
alter publication supabase_realtime add table public.schedules;
