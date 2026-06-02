# Azure Database for PostgreSQL Migration

This folder prepares KTG Signage to move data storage from Supabase PostgreSQL to Azure Database for PostgreSQL.

## Why PostgreSQL

Azure Database for PostgreSQL keeps the schema close to the current Supabase schema:

- `uuid`
- `timestamptz`
- `jsonb`
- `integer[]`
- PL/pgSQL functions
- PostgreSQL indexes

This avoids the larger rewrite that Azure SQL Database would require.

## Current Migration Status

The app still has the working Supabase client path while Azure PostgreSQL is introduced. This keeps the tested MVP alive while the backend is migrated in phases.

Target architecture for Azure tests:

```txt
Next.js App Service
  -> Next.js API routes / server actions
  -> Azure Database for PostgreSQL
  -> Azure Blob Storage for media
  -> Azure Web PubSub or polling/SSE for player update signals
```

## Environment Variables

Add these to `.env.local` and Azure App Service settings:

```txt
DATABASE_URL=postgres://<user>:<password>@<server>.postgres.database.azure.com:5432/<database>?sslmode=require
AZURE_POSTGRESQL_SSL=true
```

Keep these while Supabase Auth/Storage are still being used during the transition:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

## Create Azure PostgreSQL Server

Use Azure Database for PostgreSQL Flexible Server:

```txt
PostgreSQL version: 16
Compute: Burstable B1ms or higher for tests
Networking: allow your IP and Azure App Service outbound access
SSL: required
```

## Run Initial Schema

Run:

```txt
azure/postgresql/migrations/001_initial_schema.sql
```

You can run it from Azure Data Studio, pgAdmin, psql, or Azure Cloud Shell.

Example with `psql`:

```bash
psql "$DATABASE_URL" -f azure/postgresql/migrations/001_initial_schema.sql
```

## Important Differences from Supabase

Supabase-specific pieces are not available in Azure PostgreSQL:

- `auth.uid()`
- `auth.users`
- Supabase Storage policies
- Supabase Realtime publication to the browser
- Supabase RPC access from the browser

The Azure version must use app-controlled API routes. The server sets:

```sql
select set_config('app.current_user_id', '<profile-id>', true);
```

inside transactions when enforcing tenant/role helpers.

## Realtime Plan

For Azure tests, there are two practical options:

1. Short-term: player polling or SSE against `/api/signage/player/events`.
2. Better: Azure Web PubSub or Azure SignalR triggered when `screen_update_signals.version` changes.

## Migration Phases

1. Add Azure PostgreSQL schema.
2. Add Next.js database connection helper.
3. Build API routes for screens, playlists, media metadata, schedules, devices, and player payload.
4. Move media files from Supabase Storage to Azure Blob Storage.
5. Replace Supabase Realtime listener with Azure update signal channel.
6. Remove Supabase dependency if Auth is also migrated.
