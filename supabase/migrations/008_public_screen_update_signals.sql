create table if not exists public.screen_update_signals (
  screen_id uuid primary key references public.screens(id) on delete cascade,
  screen_key text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reason text not null default 'content_changed',
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists idx_screen_update_signals_screen_key on public.screen_update_signals(screen_key);
create index if not exists idx_screen_update_signals_org on public.screen_update_signals(organization_id);

alter table public.screen_update_signals enable row level security;

drop policy if exists "public can read screen update signals" on public.screen_update_signals;
create policy "public can read screen update signals"
on public.screen_update_signals for select
using (true);

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
end;
$$;

create or replace function public.notify_screen_row_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_screen_update_signal(coalesce(new.id, old.id), tg_table_name);
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.notify_screen_playlist_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.touch_screen_update_signal(coalesce(new.screen_id, old.screen_id), tg_table_name);
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.notify_playlist_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  playlist_id_changed uuid;
  screen_row record;
begin
  playlist_id_changed := coalesce(new.id, old.id);

  for screen_row in
    select s.id
    from public.screens s
    where s.current_playlist_id = playlist_id_changed
    union
    select sp.screen_id
    from public.screen_playlists sp
    where sp.playlist_id = playlist_id_changed
    union
    select sc.screen_id
    from public.schedules sc
    where sc.playlist_id = playlist_id_changed
      and sc.screen_id is not null
  loop
    perform public.touch_screen_update_signal(screen_row.id, tg_table_name);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.notify_playlist_item_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  playlist_id_changed uuid;
  screen_row record;
begin
  playlist_id_changed := coalesce(new.playlist_id, old.playlist_id);

  for screen_row in
    select s.id
    from public.screens s
    where s.current_playlist_id = playlist_id_changed
    union
    select sp.screen_id
    from public.screen_playlists sp
    where sp.playlist_id = playlist_id_changed
    union
    select sc.screen_id
    from public.schedules sc
    where sc.playlist_id = playlist_id_changed
      and sc.screen_id is not null
  loop
    perform public.touch_screen_update_signal(screen_row.id, tg_table_name);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.notify_media_asset_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  media_id_changed uuid;
  screen_row record;
begin
  media_id_changed := coalesce(new.id, old.id);

  for screen_row in
    select distinct s.id
    from public.playlist_items pi
    join public.playlists p on p.id = pi.playlist_id
    left join public.screen_playlists sp on sp.playlist_id = p.id
    left join public.screens s on s.id = sp.screen_id or s.current_playlist_id = p.id
    where pi.media_asset_id = media_id_changed
      and s.id is not null
    union
    select distinct sc.screen_id
    from public.playlist_items pi
    join public.schedules sc on sc.playlist_id = pi.playlist_id
    where pi.media_asset_id = media_id_changed
      and sc.screen_id is not null
  loop
    perform public.touch_screen_update_signal(screen_row.id, tg_table_name);
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.notify_schedule_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id_changed uuid;
  screen_id_changed uuid;
  screen_row record;
begin
  org_id_changed := coalesce(new.organization_id, old.organization_id);
  screen_id_changed := coalesce(new.screen_id, old.screen_id);

  if screen_id_changed is not null then
    perform public.touch_screen_update_signal(screen_id_changed, tg_table_name);
  else
    for screen_row in
      select id
      from public.screens
      where organization_id = org_id_changed
    loop
      perform public.touch_screen_update_signal(screen_row.id, tg_table_name);
    end loop;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists screens_notify_update_signal on public.screens;
create trigger screens_notify_update_signal
after insert or update or delete on public.screens
for each row execute function public.notify_screen_row_changed();

drop trigger if exists screen_playlists_notify_update_signal on public.screen_playlists;
create trigger screen_playlists_notify_update_signal
after insert or update or delete on public.screen_playlists
for each row execute function public.notify_screen_playlist_changed();

drop trigger if exists playlists_notify_update_signal on public.playlists;
create trigger playlists_notify_update_signal
after insert or update or delete on public.playlists
for each row execute function public.notify_playlist_changed();

drop trigger if exists playlist_items_notify_update_signal on public.playlist_items;
create trigger playlist_items_notify_update_signal
after insert or update or delete on public.playlist_items
for each row execute function public.notify_playlist_item_changed();

drop trigger if exists media_assets_notify_update_signal on public.media_assets;
create trigger media_assets_notify_update_signal
after insert or update or delete on public.media_assets
for each row execute function public.notify_media_asset_changed();

drop trigger if exists schedules_notify_update_signal on public.schedules;
create trigger schedules_notify_update_signal
after insert or update or delete on public.schedules
for each row execute function public.notify_schedule_changed();

insert into public.screen_update_signals(screen_id, screen_key, organization_id, reason)
select id, screen_key, organization_id, 'initial'
from public.screens
on conflict (screen_id) do update
set screen_key = excluded.screen_key,
    organization_id = excluded.organization_id,
    reason = 'initial',
    version = public.screen_update_signals.version + 1,
    updated_at = now();

alter table public.screen_update_signals replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.screen_update_signals;
exception
  when duplicate_object then null;
end;
$$;
