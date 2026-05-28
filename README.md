# KTG Signage

KTG Signage is a modern SaaS MVP for church-focused digital signage. It lets an organization manage screens, upload image/video media, build playlists, schedule content, and run public player URLs that update through Supabase Realtime.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- Supabase Row Level Security
- PWA-ready manifest and service worker placeholder

No Azure SQL, Firebase, Prisma, or Stripe are used.

## Features

- Multi-tenant organizations with `organization_members`
- Roles: owner, admin, editor, viewer
- Screens with secure generated `screen_key`
- Public player route: `/signage/screen/[screenKey]`
- Device pairing route: `/signage/pair`
- Kiosk player route: `/signage/player`
- Realtime player refresh for screens, playlists, playlist items, media assets, assignments, and schedules
- Heartbeat every 30 seconds without logging heartbeat spam
- Online/offline screen status support
- Media upload to Supabase Storage bucket `signage-media`
- Playlist builder with ordering, duration, item active state, and preview thumbnails
- Schedule priority model
- Offline fallback using the last valid payload in `localStorage`
- Demo organization onboarding with three starter screens and a Welcome Loop playlist

## Folder Structure

```txt
app/
  dashboard/
  login/
  register/
  signage/screen/[screenKey]/
components/
  dashboard/
  media/
  playlists/
  screens/
  signage/
  ui/
lib/
  hooks/
  services/
  supabase/
  utils/
supabase/migrations/
types/
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Never expose a Supabase service role key in the frontend.

## Supabase Setup

1. Create a Supabase project.
2. Run migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_rpc_functions.sql`
   - `supabase/migrations/004_storage_policies.sql`
3. Confirm the `signage-media` bucket exists and is public for the MVP.
4. Confirm Realtime is enabled for:
   - `screens`
   - `media_assets`
   - `playlists`
   - `playlist_items`
   - `screen_playlists`
   - `schedules`

## Database and Security

All primary tenant tables include `organization_id` where appropriate. RLS is enabled on all main tables. Users can only read organizations and data where they are members. The public player does not query tables directly; it uses `get_screen_payload(screen_key_input text)`, which returns only screen, playlist, and playback item data.

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

Build:

```bash
npm run build
```

## First Screen Workflow

1. Register a new account.
2. The app creates a profile, organization, owner membership, three demo screens, and a Welcome Loop playlist.
3. Go to Media Library and upload your first media asset.
4. Go to Playlists and edit Welcome Loop or create a new playlist.
5. Add active media assets and set durations.
6. Assign the playlist to Lobby, Sanctuary, Fellowship Hall, or any new screen.
7. On the TV, open:

```txt
NEXT_PUBLIC_APP_URL/signage/pair
```

8. Enter the `KTG-######` code in Dashboard → Devices and choose the screen.
9. The TV opens:

```txt
NEXT_PUBLIC_APP_URL/signage/player
```

Direct screen URLs still work as an admin fallback:

```txt
NEXT_PUBLIC_APP_URL/signage/screen/[screenKey]
```

## Player Behavior

The direct screen player loads `get_screen_payload`, subscribes to Supabase Realtime changes, and reloads payload when related rows change. The device player uses a stored `device_key`, resolves the assigned screen through `get_device_assignment`, and updates automatically when the admin pairs or reassigns the device.

The kiosk player asks the browser to enter fullscreen, hides the cursor, shows no navigation UI, and exposes a temporary `Cancel kiosk` button when there is pointer/keyboard activity. True OS-level kiosk lock must be configured on the device/browser; web apps cannot prevent a user from leaving fullscreen at the operating-system level.

## Deployment Notes

- Set production `NEXT_PUBLIC_APP_URL`.
- Use HTTPS for device player reliability.
- Keep the anon key public and RLS strict.
- Schedule `mark_stale_screens_offline()` from Supabase cron or an external job to mark screens offline after 90 seconds without heartbeat.
- Public media URLs are used for MVP reliability. Move to signed URLs when device registration and pairing codes are implemented.

## Roadmap

- Stripe billing
- ChurchHub integration
- Canva integration
- Google Slides integration
- Power BI integration
- Weather widget
- Bible verse widget
- Giving QR generator
- Visitor registration QR
- SMS announcement integration
- Advanced offline caching
- Device registration with pairing code
- Multi-location support
- Templates marketplace
