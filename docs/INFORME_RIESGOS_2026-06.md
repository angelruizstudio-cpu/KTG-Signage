# Informe Ejecutivo de Evaluación de Riesgos — KTG Signage

**Fecha:** 22 de junio de 2026
**Alcance:** Aplicación Next.js 15 + Supabase + PostgreSQL (Azure) para gestión de cartelería digital.

## 1. Resumen ejecutivo

KTG Signage es un MVP **bien arquitecturado**, con separación clara de capas (`app/`, `components/`, `lib/`, `supabase/`) y una base de seguridad sólida gracias al uso extensivo de **Row Level Security (RLS)** en PostgreSQL. Sin embargo, existen **2 riesgos críticos** y varios riesgos altos/medios que deben resolverse antes de operar con datos sensibles o en un entorno multi-cliente real. Ninguno de los hallazgos requiere un rediseño; son correcciones puntuales y acotadas.

**Veredicto:** Apto para seguir en fase MVP/piloto controlado. No recomendado para producción con datos sensibles hasta resolver los hallazgos críticos y altos.

## 2. Fortalezas

| Área | Fortaleza |
|---|---|
| Autorización | RLS activo en todas las tablas, con roles granulares (owner/admin/editor/viewer) y funciones `is_org_member()` / `has_org_role()` aplicadas a nivel de base de datos. |
| Arquitectura | Separación clara cliente/servidor, sin rutas API propias (delega en RPCs de Supabase con lógica de seguridad centralizada). |
| Base de datos | Esquema moderno (UUID, `timestamptz`), índices en FKs, triggers de auditoría (`updated_at`), soft-delete en lugar de borrados destructivos. |
| Calidad de código | TypeScript en modo estricto, hooks aislados, utilidades centralizadas, dependencias mínimas (sin ORM innecesario). |
| Documentación | `.env.example` y guías de despliegue a Azure presentes; el README advierte explícitamente no exponer la *service role key*. |

## 3. Riesgos y debilidades

### Críticos

| # | Hallazgo | Ubicación |
|---|---|---|
| C1 | Fallback silencioso a credenciales "placeholder" si faltan las variables de entorno de Supabase, en vez de fallar explícitamente al arrancar. | `lib/supabase/env.ts:2,6` |
| C2 | La función de emparejamiento de dispositivos (`start_device_pairing`) está concedida a usuarios **anónimos**, sin autenticación ni límite de frecuencia (rate-limiting). | `supabase/migrations/005_device_pairing.sql:226` |

### Altos

| # | Hallazgo | Ubicación |
|---|---|---|
| A1 | El flujo de CI/CD a Azure App Service podría exponer credenciales si `AZURE_WEBAPP_PUBLISH_PROFILE` no está correctamente resguardado en GitHub Secrets (requiere verificación manual en el repositorio). | `.github/workflows/azure-app-service.yml:28-31` |
| A2 | La validación del tipo de archivo en subida de medios se hace únicamente en el cliente (`file.type`, controlable por el usuario); la validación real recae solo en la política de Storage. | `lib/services/media.ts:29-31` |

### Medios

| # | Hallazgo | Ubicación |
|---|---|---|
| M1 | Generación de `device_key` con `md5(random()::text || ...)`, no criptográficamente robusta pese a tener `pgcrypto` ya disponible. | `supabase/migrations/005_device_pairing.sql:72-73` |
| M2 | `device_key` almacenada en `localStorage`, expuesta ante un eventual XSS en la pantalla de signage. | `lib/hooks/useDeviceAssignment.ts:19` |
| M3 | URL de proyecto Supabase con apariencia real incluida como ejemplo en la documentación de despliegue. | `docs/AZURE_DEPLOYMENT.md:20` |
| M4 | Sin rate-limiting en RPCs públicas (ej. `get_screen_payload`), expuestas a abuso/DoS de bajo costo. | `supabase/migrations/005_device_pairing.sql` |
| M5 | Sin documentación de política de backups/retención (RTO/RPO) para PostgreSQL en Azure. | `docs/AZURE_POSTGRESQL_MIGRATION.md` |
| M6 | Mensajes de error de backend reenviados tal cual al usuario, riesgo de fuga de información interna. | `app/register/page.tsx:41` |

### Bajos

- Migraciones sin timestamp (solo numeración secuencial); aceptable para MVP pero riesgo de conflicto si crece el equipo.
- Sin tests automatizados (`*.test.ts`).
- Sin logging/monitoreo centralizado (Sentry, Application Insights).
- Service Worker actualmente no cachea nada (sin riesgo, pero sin beneficio offline tampoco).

## 4. Tabla de riesgos priorizada

| Severidad | Riesgo | Impacto si se explota |
|---|---|---|
| Crítico | Credenciales placeholder silenciosas | La app puede operar "viva" contra un backend inexistente sin alertar a nadie. |
| Crítico | Pairing de dispositivos sin auth | Cualquier persona externa podría intentar vincular un dispositivo no autorizado a una organización. |
| Alto | Secretos de despliegue mal resguardados (a verificar) | Compromiso de credenciales de despliegue Azure. |
| Alto | Validación MIME solo en cliente | Subida de archivos maliciosos camuflados con extensión/MIME falso. |
| Medio | `device_key` débil + expuesta en localStorage | Suplantación de un dispositivo de señalización. |
| Medio | Sin rate-limiting | Abuso de recursos / pequeño DoS sobre RPCs públicas. |

## 5. Recomendaciones de mejora

1. **Fail-fast en configuración** — eliminar los fallbacks "placeholder" en `lib/supabase/env.ts`; lanzar error explícito si faltan `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` al arrancar.
2. **Restringir el pairing de dispositivos** — otorgar `EXECUTE` en `start_device_pairing()` solo a `authenticated`, y añadir un límite de intentos por usuario/IP en una ventana de tiempo.
3. **Auditar secretos de CI/CD** — confirmar en GitHub que `AZURE_WEBAPP_PUBLISH_PROFILE` y demás credenciales están en *Repository Secrets* (no en el YAML ni en logs de build).
4. **Reemplazar generación de `device_key`** — usar `encode(gen_random_bytes(32), 'hex')` en lugar de `md5(random()...)`.
5. **Sanear documentación** — sustituir la URL real de Supabase en `docs/AZURE_DEPLOYMENT.md` por un placeholder genérico (`<tu-proyecto>.supabase.co`).
6. **Rate-limiting en RPCs públicas** — implementar límites a nivel de Supabase Edge Functions o políticas adicionales en `get_screen_payload` / pairing.
7. **Sanitizar mensajes de error** — no reenviar mensajes de excepción crudos del backend al usuario; mapear a mensajes genéricos y loguear el detalle internamente.
8. **Plan de backups documentado** — definir y documentar RTO/RPO para la base de datos en Azure, aunque ya existan backups automáticos.
9. **Mediano plazo** — incorporar tests automatizados mínimos (flujos de auth y RLS), y un servicio de logging/monitoreo (Sentry o Azure Application Insights) antes de pasar a producción con clientes reales.

## 6. Conclusión

El sistema tiene unos cimientos sólidos, especialmente en el modelo de seguridad de base de datos (RLS). Los riesgos identificados son corregibles en un esfuerzo de pocos días-persona y no comprometen la arquitectura general. Se recomienda priorizar los dos hallazgos críticos (C1, C2) antes de cualquier despliegue con dispositivos o usuarios reales fuera de un entorno controlado.
