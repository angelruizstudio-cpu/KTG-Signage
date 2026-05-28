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
begin
  new_device_key :=
    md5(random()::text || clock_timestamp()::text || coalesce(user_agent_input, '')) ||
    md5(random()::text || clock_timestamp()::text || coalesce(user_agent_input, ''));
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
      lower(regexp_replace(screen_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substring(md5(screen_name || random()::text || clock_timestamp()::text) from 1 for 6),
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

grant execute on function public.start_device_pairing(text) to anon, authenticated;
grant execute on function public.bootstrap_organization(text, text) to authenticated;
