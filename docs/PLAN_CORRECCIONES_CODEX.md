# Plan de Correcciones — Prompts para Codex

**Fecha:** 10 de julio de 2026
**Objetivo:** Dejar KTG Signage listo para instalaciones reales.
**Base:** Análisis experto de la app + `docs/INFORME_RIESGOS_2026-06.md`.

## Cómo usar este plan

1. **Una tarea por sesión de Codex**, en el orden indicado. La Tarea 0 va antes que cualquiera que cree migraciones; las Tareas 1–2 van antes de desplegar nada real.
2. Al final de cada tarea, pedir siempre: *"ejecuta `npm run build` y `npm run lint` y pega la salida"*. Es la red de seguridad hasta que existan tests (Tarea 7).
3. Las migraciones (Tareas 2 y 6) **no se verifican solo compilando**: probarlas en un proyecto Supabase de staging antes de producción. `CREATE OR REPLACE FUNCTION` sobre funciones con `GRANT` existente tiene matices.
4. Si Codex propone restringir `start_device_pairing` a `authenticated`, **rechazarlo** — rompe el flujo de pairing del TV (el dispositivo es anónimo por diseño). La protección correcta es el rate-limiting de la Tarea 2.

---

## Tarea 0 — Arreglar numeración duplicada de migraciones

> **Nota:** hay dos archivos con prefijo `009` en `supabase/migrations/`. Cualquier migración nueva debe empezar en `010`, así que esto va primero.

```text
En supabase/migrations/ existen dos archivos con el prefijo 009:
009_create_screen_rpc.sql y 009_security_timezone_pairing_fixes.sql.
Renombra el que se ejecuta después (verifica si uno depende del otro leyendo ambos)
a 010_, y actualiza cualquier referencia a esa numeración en README.md
(sección "Supabase Setup" menciona "001 through 009").
No cambies el contenido SQL, solo el nombre de archivo y la documentación.
```

**Aceptación:** no hay dos archivos con el mismo prefijo numérico; el README refleja el rango real.

---

## Tarea 1 — CRÍTICO C1: eliminar fallback silencioso de credenciales

```text
En lib/supabase/env.ts hay un fallback a valores "placeholder" cuando faltan
NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Elimínalo y haz
fail-fast: si falta cualquiera de las dos variables, lanza un Error con un
mensaje claro que nombre la variable faltante. Verifica que lib/supabase/client.ts,
lib/supabase/server.ts y lib/supabase/middleware.ts sigan compilando.
Ejecuta npm run build para confirmar que con las variables presentes todo compila,
y documenta en README.md que la app no arranca sin esas variables.
```

**Aceptación:** con `.env.local` vacío la app falla al arrancar con mensaje explícito; con variables válidas, `npm run build` pasa.

---

## Tarea 2 — CRÍTICO C2 + M1: endurecer el pairing de dispositivos

> **Matiz importante:** el TV que solicita el código es anónimo por diseño (flujo `/signage/pair`). La corrección correcta es rate-limiting + claves fuertes, **no** quitar el acceso anónimo.

```text
Crea una nueva migración supabase/migrations/011_pairing_hardening.sql que:

1. Reemplace la generación de device_key en start_device_pairing
   (actualmente usa md5(random()::text || ...)) por
   encode(gen_random_bytes(32), 'hex'). pgcrypto ya está disponible.

2. Añada rate-limiting a start_device_pairing: crea una tabla
   pairing_attempts (id, created_at, fingerprint text) donde fingerprint
   sea un hash del user_agent_input; dentro de la función, antes de crear
   el pairing, cuenta los intentos de los últimos 10 minutos y si hay más
   de 5 con el mismo fingerprint, o más de 30 en total (protección global),
   lanza una excepción con mensaje genérico 'Too many pairing attempts'.
   Añade limpieza de filas viejas de pairing_attempts al job de cron
   existente que limpia pairings expirados (ver migración 009_security_timezone_pairing_fixes.sql).

3. Mantén el GRANT EXECUTE a anon en start_device_pairing (el dispositivo
   no está autenticado), pero verifica que complete_device_pairing solo sea
   ejecutable por authenticated y que valide membresía en la organización.

Lee primero supabase/migrations/005_device_pairing.sql completo para
replicar la firma y el comportamiento de las funciones existentes con
CREATE OR REPLACE.
```

**Aceptación:** la migración corre limpia sobre el esquema existente; `device_key` nuevo tiene 64 chars hex; más de 5 intentos seguidos con el mismo user agent devuelven error.

---

## Tarea 3 — Cache de media en el Service Worker

> Gap #1 de confiabilidad: el payload JSON se cachea en `localStorage`, pero los archivos de media no. Si la red cae y el caché HTTP del navegador expulsa los assets, la pantalla queda en negro.

```text
public/sw.js actualmente no cachea nada. Impleméntalo así:

1. Estrategia cache-first con actualización en segundo plano (stale-while-revalidate)
   SOLO para requests cuyo URL apunte al bucket de Supabase Storage
   'signage-media' (matchea por pathname que contenga '/storage/v1/object/public/signage-media/').
   No caches HTML, ni llamadas a /rest/ o /auth/ de Supabase.

2. Usa un nombre de caché versionado (p.ej. 'ktg-media-v1') y en activate
   borra versiones viejas.

3. Añade límite de tamaño: tras cada escritura, si el caché supera 50 entradas,
   elimina las más antiguas (FIFO simple con cache.keys()).

4. Registra el service worker únicamente en las rutas de player: crea un
   componente cliente RegisterServiceWorker que haga
   navigator.serviceWorker.register('/sw.js') en useEffect, y móntalo en
   app/signage/screen/[screenKey]/page.tsx y app/signage/player/page.tsx
   (revisa la estructura real de esas carpetas antes de editar).

5. En lib/hooks/useScreenRealtime.ts, tras guardar un payload nuevo con éxito,
   no hace falta cambiar nada: el SW interceptará los fetch de <img>/<video>.

Ejecuta npm run build y npm run lint al terminar.
```

**Aceptación:** con DevTools → Network offline, un player que ya reprodujo el contenido una vez sigue mostrando imágenes y videos cacheados; el dashboard no pasa por el SW.

---

## Tarea 4 — Pre-carga del siguiente ítem en los players

```text
En components/signage/ScreenPlayer.tsx y components/signage/KioskScreenPlayer.tsx,
añade pre-carga del siguiente ítem de la playlist: calcula
next = items[(index + 1) % items.length] y, si existe y es distinto del actual,
renderiza un precargador invisible:
- para imágenes: un <img> con el src del siguiente asset dentro de un
  contenedor con className "hidden" (o crea new Image() en un useEffect);
- para videos: un <link rel="preload" as="video"> no funciona bien cross-browser,
  así que usa un <video src preload="auto" muted> oculto con aria-hidden.
Extrae la lógica compartida (durationMs, watchdog y ahora el preloader) a un
módulo común lib/signage/playback.ts + componente components/signage/MediaPreloader.tsx
para no duplicarla en los dos players, ya que hoy está copiada en ambos archivos.
Ejecuta npm run build y npm run lint.
```

**Aceptación:** en Network de DevTools se ve que el siguiente asset empieza a descargarse mientras el actual se reproduce; ambos players comparten las utilidades.

---

## Tarea 5 — Sanitizar mensajes de error (M6)

```text
En lib/utils/errors.ts ya existe un módulo de errores; revísalo y úsalo como base.
Recorre app/register/page.tsx, app/login/page.tsx y los formularios del dashboard
que muestren error.message crudo de Supabase al usuario. Crea una función
getSafeErrorMessage(error, t) que mapee los errores conocidos de Supabase Auth
(invalid credentials, email already registered, weak password, rate limit) a
claves de traducción en lib/i18n/translations.ts (añádelas en ambos idiomas),
y para cualquier otro error devuelva un mensaje genérico mientras hace
console.error del detalle. Sustituye los usos directos de error.message en la UI.
```

**Aceptación:** ningún componente de UI renderiza `error.message` de Supabase directamente; errores conocidos salen traducidos.

---

## Tarea 6 — Endurecer validación de subida en Storage (A2)

```text
Crea una migración supabase/migrations/012_storage_mime_hardening.sql que
endurezca las políticas del bucket signage-media (lee primero
supabase/migrations/004_storage_policies.sql):
- restringe INSERT a los content-types image/jpeg, image/png, image/webp,
  video/mp4, video/webm usando la columna metadata del objeto de storage
  (storage.objects.metadata->>'mimetype'),
- verifica que el primer segmento del path (organization_id) corresponda a una
  organización donde el usuario tiene rol owner/admin/editor, si la política
  actual no lo hace ya.
Además, si el bucket se crea por migración, fija allowed_mime_types y
file_size_limit en la fila de storage.buckets.
```

**Aceptación:** un upload con content-type no permitido falla a nivel de Storage aunque el cliente lo intente saltar.

---

## Tarea 7 — Tests mínimos + CI

```text
El repo no tiene tests. Configura Vitest (compatible con el tsconfig actual,
paths @/*) y escribe tests unitarios para la lógica pura, sin mockear Supabase
entero: lib/utils/format.ts, lib/utils/timeout.ts, lib/utils/errors.ts
(incluida la nueva getSafeErrorMessage), la validación de tipos/tamaños de
uploadMediaAsset en lib/services/media.ts (mockeando el cliente con vi.fn),
y las funciones de duración/watchdog extraídas a lib/signage/playback.ts.
Añade "test": "vitest run" a package.json y agrégalo al workflow
.github/workflows/ci.yml después del lint.
```

**Aceptación:** `npm test` pasa localmente y en CI.

---

## Fase 2 (producto, no correcciones — fuera de este plan)

- **Alertas de pantalla caída:** hoy hay detección (`mark_stale_screens_offline`) pero ninguna notificación push/email al admin.
- **Modelo de zonas/layouts:** decidirlo **antes** de construir los widgets del roadmap (clima, versículo, ticker), porque cambia el esquema de `playlist_items`.
- **Proof-of-play:** registro de qué se reprodujo, cuándo y en qué pantalla — necesario si algún día hay anuncios de patrocinadores.
- **Runbook de despliegue de dispositivos:** documentar TV box + kiosk browser (Fully Kiosk en Android, modo kiosco de Chrome OS) con auto-arranque en `/signage/player` y auto-recuperación tras crash o reinicio. No es código, pero sin esto no hay confiabilidad 24/7 real.
- **Pipeline de optimización de media:** compresión de imágenes y transcodificación/límite de resolución de video al subir; hoy un video 4K de 250 MB se sirve tal cual a cualquier TV box de gama baja.

## Estado

| Tarea | Estado |
|---|---|
| 0 — Migraciones duplicadas | Pendiente |
| 1 — Fail-fast credenciales (C1) | Pendiente |
| 2 — Pairing hardening (C2, M1) | Pendiente |
| 3 — Cache de media en SW | Pendiente |
| 4 — Pre-carga siguiente ítem | Pendiente |
| 5 — Sanitizar errores (M6) | Pendiente |
| 6 — Storage MIME hardening (A2) | Pendiente |
| 7 — Tests + CI | Pendiente |
