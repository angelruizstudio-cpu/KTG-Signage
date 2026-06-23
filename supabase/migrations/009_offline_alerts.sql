alter table public.organizations
  add column if not exists alert_email text;

alter table public.screen_events
  add column if not exists notified_at timestamptz;

create or replace function public.mark_stale_screens_offline()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  with stale as (
    update public.screens
    set status = 'offline',
        updated_at = now()
    where status = 'online'
      and (last_seen_at is null or last_seen_at < now() - interval '90 seconds')
    returning id, name
  )
  insert into public.screen_events(screen_id, event_type, message)
  select id, 'screen_offline', 'Screen went offline: ' || name
  from stale;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.mark_stale_screens_offline() to authenticated, service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.notify_offline_screens()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  resend_key text;
  evt record;
begin
  perform public.mark_stale_screens_offline();

  select decrypted_secret into resend_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if resend_key is null then
    return;
  end if;

  for evt in
    select se.id, s.name as screen_name, o.alert_email, o.name as org_name
    from public.screen_events se
    join public.screens s on s.id = se.screen_id
    join public.organizations o on o.id = s.organization_id
    where se.event_type = 'screen_offline'
      and se.notified_at is null
      and o.alert_email is not null
  loop
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || resend_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'KTG Signage <alerts@kingdomtechgroup.org>',
        'to', evt.alert_email,
        'subject', 'Screen offline: ' || evt.screen_name,
        'text', 'Your screen "' || evt.screen_name || '" at ' || evt.org_name || ' went offline.'
      )
    );

    update public.screen_events set notified_at = now() where id = evt.id;
  end loop;
end;
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'notify-offline-screens') then
    perform cron.unschedule('notify-offline-screens');
  end if;
end $$;

select cron.schedule('notify-offline-screens', '* * * * *', 'select public.notify_offline_screens();');
