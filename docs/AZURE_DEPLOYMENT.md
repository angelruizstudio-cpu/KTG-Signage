# Azure App Service Deployment

KTG Signage can run on Azure App Service Linux while Supabase remains the backend for Auth, PostgreSQL, Storage, Realtime, and RLS.

## Recommended Test Target

- Azure App Service
- Linux
- Node.js 20 LTS
- Basic B1 or higher for testing
- HTTPS only

Avoid Azure Static Web Apps for this MVP because the app uses Next.js App Router, middleware, dynamic routes, and server behavior that are simpler to test on App Service.

## App Service Settings

Create these App Settings in Azure:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://blrvfbymkzucpowscgiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase anon public key>
NEXT_PUBLIC_APP_URL=https://<your-app-name>.azurewebsites.net
SCM_DO_BUILD_DURING_DEPLOYMENT=true
WEBSITE_NODE_DEFAULT_VERSION=~20
```

Startup command:

```txt
npm run start
```

## GitHub Secrets

In GitHub repository settings, add:

```txt
AZURE_WEBAPP_NAME
AZURE_WEBAPP_PUBLISH_PROFILE
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

Get the publish profile from:

```txt
Azure Portal -> App Service -> Overview -> Get publish profile
```

## Deploy From GitHub Actions

This repo includes:

```txt
.github/workflows/azure-app-service.yml
```

It runs on pushes to `main` and can also be triggered manually from GitHub Actions.

## Supabase URL Configuration

After Azure deploy, update:

```txt
NEXT_PUBLIC_APP_URL=https://<your-app-name>.azurewebsites.net
```

Then restart the Azure App Service.

## Testing Checklist

1. Open `/login`.
2. Open `/dashboard`.
3. Upload one image.
4. Add it to Welcome Loop.
5. Open `/signage/pair` on a phone or TV browser.
6. Pair the device from `/dashboard/devices`.
7. Change playlist order and confirm the player updates without refresh.
8. Test `/signage/player` fullscreen/kiosk behavior.
