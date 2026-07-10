create or replace function public.create_screen(
  organization_id_input uuid,
  name_input text,
  location_input text default null,
  orientation_input text default 'landscape',
  current_playlist_id_input uuid default null
)
returns public.screens
language plpgsql
security definer
set search_path = public
as $$
declare
  screen_record public.screens%rowtype;
  clean_name text := nullif(trim(name_input), '');
  clean_orientation text := coalesce(nullif(trim(orientation_input), ''), 'landscape');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if clean_name is null then
    raise exception 'Screen name is required';
  end if;

  if clean_orientation not in ('landscape', 'portrait') then
    raise exception 'Invalid screen orientation';
  end if;

  if not public.has_org_role(organization_id_input, array['owner', 'admin']) then
    raise exception 'You do not have permission to create screens in this organization';
  end if;

  if current_playlist_id_input is not null then
    if not exists (
      select 1
      from public.playlists p
      where p.id = current_playlist_id_input
        and p.organization_id = organization_id_input
        and p.is_active = true
    ) then
      raise exception 'Playlist is not active or does not belong to this organization';
    end if;
  end if;

  insert into public.screens(
    organization_id,
    name,
    location,
    screen_key,
    orientation,
    current_playlist_id
  )
  values (
    organization_id_input,
    clean_name,
    nullif(trim(location_input), ''),
    lower(regexp_replace(clean_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(md5(clean_name || organization_id_input::text || random()::text || clock_timestamp()::text) from 1 for 8),
    clean_orientation,
    current_playlist_id_input
  )
  returning * into screen_record;

  return screen_record;
end;
$$;

grant execute on function public.create_screen(uuid, text, text, text, uuid) to authenticated;

