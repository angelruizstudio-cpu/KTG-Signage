alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.screens enable row level security;
alter table public.media_assets enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.screen_playlists enable row level security;
alter table public.schedules enable row level security;
alter table public.screen_events enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = org_id
      and om.user_id = auth.uid()
      and om.role = any(allowed_roles)
  );
$$;

create policy "members can read organizations"
on public.organizations for select
using (public.is_org_member(id));

create policy "owners can update organizations"
on public.organizations for update
using (public.has_org_role(id, array['owner']))
with check (public.has_org_role(id, array['owner']));

create policy "authenticated users can create organizations"
on public.organizations for insert
with check (auth.uid() is not null);

create policy "owners can delete organizations"
on public.organizations for delete
using (public.has_org_role(id, array['owner']));

create policy "users can read their profile"
on public.profiles for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and theirs.user_id = profiles.id
  )
);

create policy "users can create their profile"
on public.profiles for insert
with check (id = auth.uid());

create policy "users can update their profile"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "members can read organization memberships"
on public.organization_members for select
using (public.is_org_member(organization_id));

create policy "owners can manage organization memberships"
on public.organization_members for all
using (public.has_org_role(organization_id, array['owner']))
with check (public.has_org_role(organization_id, array['owner']));

create policy "users can create first owner membership"
on public.organization_members for insert
with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1
    from public.organization_members existing
    where existing.organization_id = organization_members.organization_id
  )
);

create policy "members can read screens"
on public.screens for select
using (public.is_org_member(organization_id));

create policy "owners and admins can manage screens"
on public.screens for all
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "members can read media assets"
on public.media_assets for select
using (public.is_org_member(organization_id));

create policy "owners admins editors can manage media assets"
on public.media_assets for all
using (public.has_org_role(organization_id, array['owner', 'admin', 'editor']))
with check (public.has_org_role(organization_id, array['owner', 'admin', 'editor']));

create policy "members can read playlists"
on public.playlists for select
using (public.is_org_member(organization_id));

create policy "owners admins editors can manage playlists"
on public.playlists for all
using (public.has_org_role(organization_id, array['owner', 'admin', 'editor']))
with check (public.has_org_role(organization_id, array['owner', 'admin', 'editor']));

create policy "members can read playlist items"
on public.playlist_items for select
using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id
      and public.is_org_member(p.organization_id)
  )
);

create policy "owners admins editors can manage playlist items"
on public.playlist_items for all
using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id
      and public.has_org_role(p.organization_id, array['owner', 'admin', 'editor'])
  )
)
with check (
  exists (
    select 1
    from public.playlists p
    join public.media_assets ma on ma.id = playlist_items.media_asset_id
    where p.id = playlist_items.playlist_id
      and ma.organization_id = p.organization_id
      and ma.is_active = true
      and public.has_org_role(p.organization_id, array['owner', 'admin', 'editor'])
  )
);

create policy "members can read screen playlists"
on public.screen_playlists for select
using (
  exists (
    select 1 from public.screens s
    where s.id = screen_playlists.screen_id
      and public.is_org_member(s.organization_id)
  )
);

create policy "owners admins can manage screen playlists"
on public.screen_playlists for all
using (
  exists (
    select 1 from public.screens s
    where s.id = screen_playlists.screen_id
      and public.has_org_role(s.organization_id, array['owner', 'admin'])
  )
)
with check (
  exists (
    select 1
    from public.screens s
    join public.playlists p on p.id = screen_playlists.playlist_id
    where s.id = screen_playlists.screen_id
      and p.organization_id = s.organization_id
      and p.is_active = true
      and public.has_org_role(s.organization_id, array['owner', 'admin'])
  )
);

create policy "members can read schedules"
on public.schedules for select
using (public.is_org_member(organization_id));

create policy "owners admins can manage schedules"
on public.schedules for all
using (public.has_org_role(organization_id, array['owner', 'admin']))
with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "members can read screen events"
on public.screen_events for select
using (
  exists (
    select 1 from public.screens s
    where s.id = screen_events.screen_id
      and public.is_org_member(s.organization_id)
  )
);

create policy "members can create screen events"
on public.screen_events for insert
with check (
  exists (
    select 1 from public.screens s
    where s.id = screen_events.screen_id
      and public.has_org_role(s.organization_id, array['owner', 'admin', 'editor'])
  )
);
