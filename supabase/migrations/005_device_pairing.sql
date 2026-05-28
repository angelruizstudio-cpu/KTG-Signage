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

create index if not exists idx_signage_devices_org on public.signage_devices(organization_id);
create index if not exists idx_signage_devices_screen on public.signage_devices(screen_id);
create index if not exists idx_signage_devices_key on public.signage_devices(device_key);
create index if not exists idx_signage_devices_code on public.signage_devices(pairing_code);
create index if not exists idx_signage_devices_status_seen on public.signage_devices(status, last_seen_at);

create trigger signage_devices_set_updated_at
before update on public.signage_devices
for each row execute function public.set_updated_at();

alter table public.signage_devices enable row level security;

create policy "members can read signage devices"
on public.signage_devices for select
using (organization_id is not null and public.is_org_member(organization_id));

create policy "owners admins can manage signage devices"
on public.signage_devices for all
using (organization_id is not null and public.has_org_role(organization_id, array['owner', 'admin']))
with check (organization_id is not null and public.has_org_role(organization_id, array['owner', 'admin']));

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
        and sd.status = 'pending'
        and sd.pairing_expires_at > now()
    );
  end loop;

  return code;
end;
$$;

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

create or replace function public.pair_signage_device(
  pairing_code_input text,
  screen_id_input uuid,
  device_name_input text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  screen_record public.screens%rowtype;
  device_record public.signage_devices%rowtype;
begin
  select *
  into screen_record
  from public.screens
  where id = screen_id_input;

  if not found then
    raise exception 'Screen not found';
  end if;

  if not public.has_org_role(screen_record.organization_id, array['owner', 'admin']) then
    raise exception 'Not authorized';
  end if;

  select *
  into device_record
  from public.signage_devices
  where pairing_code = upper(pairing_code_input)
    and status = 'pending'
    and pairing_expires_at > now()
  limit 1;

  if not found then
    raise exception 'Pairing code is invalid or expired';
  end if;

  update public.signage_devices
  set organization_id = screen_record.organization_id,
      screen_id = screen_record.id,
      status = 'paired',
      name = coalesce(nullif(device_name_input, ''), screen_record.name || ' device'),
      paired_at = now(),
      updated_at = now()
  where id = device_record.id
  returning * into device_record;

  return jsonb_build_object(
    'device_id', device_record.id,
    'screen_id', device_record.screen_id,
    'status', device_record.status,
    'name', device_record.name
  );
end;
$$;

create or replace function public.get_device_assignment(device_key_input text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  device_record public.signage_devices%rowtype;
  screen_record public.screens%rowtype;
begin
  select *
  into device_record
  from public.signage_devices
  where device_key = device_key_input
  limit 1;

  if not found then
    return jsonb_build_object('device', null, 'screen', null, 'payload', null);
  end if;

  if device_record.status <> 'paired' or device_record.screen_id is null then
    return jsonb_build_object(
      'device', jsonb_build_object(
        'id', device_record.id,
        'status', device_record.status,
        'pairing_code', device_record.pairing_code,
        'pairing_expires_at', device_record.pairing_expires_at
      ),
      'screen', null,
      'payload', null
    );
  end if;

  select *
  into screen_record
  from public.screens
  where id = device_record.screen_id;

  return jsonb_build_object(
    'device', jsonb_build_object(
      'id', device_record.id,
      'organization_id', device_record.organization_id,
      'screen_id', device_record.screen_id,
      'status', device_record.status,
      'name', device_record.name,
      'last_seen_at', device_record.last_seen_at
    ),
    'screen', jsonb_build_object(
      'id', screen_record.id,
      'screen_key', screen_record.screen_key,
      'name', screen_record.name
    ),
    'payload', public.get_screen_payload(screen_record.screen_key)
  );
end;
$$;

create or replace function public.update_device_heartbeat(device_key_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  device_record public.signage_devices%rowtype;
begin
  update public.signage_devices
  set last_seen_at = now(),
      updated_at = now()
  where device_key = device_key_input
    and status = 'paired'
  returning * into device_record;

  if device_record.screen_id is not null then
    perform public.update_screen_heartbeat((select screen_key from public.screens where id = device_record.screen_id));
  end if;
end;
$$;

grant execute on function public.start_device_pairing(text) to anon, authenticated;
grant execute on function public.pair_signage_device(text, uuid, text) to authenticated;
grant execute on function public.get_device_assignment(text) to anon, authenticated;
grant execute on function public.update_device_heartbeat(text) to anon, authenticated;

alter table public.signage_devices replica identity full;
alter publication supabase_realtime add table public.signage_devices;
