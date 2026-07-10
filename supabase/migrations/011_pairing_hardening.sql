-- 011: Pairing hardening

create table if not exists public.pairing_attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fingerprint text not null
);

create index if not exists idx_pairing_attempts_created_at on public.pairing_attempts(created_at);
create index if not exists idx_pairing_attempts_fingerprint_created_at on public.pairing_attempts(fingerprint, created_at desc);

create or replace function public.cleanup_expired_pairings()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.signage_devices
  where status = 'pending'
    and pairing_expires_at < now() - interval '1 hour';

  delete from public.pairing_attempts
  where created_at < now() - interval '1 day';
end;
$$;

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
  attempt_fingerprint text := encode(digest(coalesce(nullif(trim(user_agent_input), ''), 'unknown'), 'sha256'), 'hex');
  attempts_same integer;
  attempts_total integer;
begin
  perform public.cleanup_expired_pairings();

  insert into public.pairing_attempts(fingerprint)
  values (attempt_fingerprint);

  select count(*)
  into attempts_same
  from public.pairing_attempts pa
  where pa.fingerprint = attempt_fingerprint
    and pa.created_at > now() - interval '10 minutes';

  select count(*)
  into attempts_total
  from public.pairing_attempts pa
  where pa.created_at > now() - interval '10 minutes';

  if attempts_same > 5 or attempts_total > 30 then
    raise exception 'Too many pairing attempts';
  end if;

  new_device_key := encode(gen_random_bytes(32), 'hex');
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

create or replace function public.complete_device_pairing(
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
  current_user_id uuid;
  screen_record public.screens%rowtype;
  device_record public.signage_devices%rowtype;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

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

create or replace function public.pair_signage_device(
  pairing_code_input text,
  screen_id_input uuid,
  device_name_input text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.complete_device_pairing($1, $2, $3);
$$;

grant execute on function public.start_device_pairing(text) to anon, authenticated;
grant execute on function public.complete_device_pairing(text, uuid, text) to authenticated;
grant execute on function public.pair_signage_device(text, uuid, text) to authenticated;

do $do$
begin
  begin
    perform cron.unschedule('ktg-cleanup-expired-pairing');
  exception
    when others then null;
  end;

  perform cron.schedule(
    'ktg-cleanup-expired-pairing',
    '17 * * * *',
    'select public.cleanup_expired_pairings();'
  );
exception
  when invalid_schema_name then null;
  when undefined_function then null;
  when undefined_table then null;
  when insufficient_privilege then null;
end;
$do$;
