# Arquitectura

Visión general de cómo está armado Smart Learning: capas, flujo de una request, modelo de autenticación/autorización y estrategia de acceso a datos.

---

## 1. Capas de la aplicación

```
┌─────────────────────────────────────────────────────────┐
│  proxy.ts (Edge Runtime)                                  │
│  - Valida la sesión con supabase.auth.getUser()           │
│  - Redirige a /login si no hay sesión en rutas protegidas │
│  - Bloquea a 'administrativo' de secciones de /director   │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│  app/(dashboard)/<rol>/...  (Server Components)            │
│  - layout.tsx: getServerProfile() → perfil del usuario     │
│  - page.tsx: lee datos (Drizzle o Supabase) y renderiza     │
└───────────────────────────┬───────────────────────────────┘
                             │ formularios / FormButton
┌───────────────────────────▼───────────────────────────────┐
│  modules/<dominio>/actions.ts  ("use server")               │
│  - requireRole([...])                                        │
│  - valida con Zod (schemas.ts)                                │
│  - ejecuta lógica vía services/<dominio>.service.ts            │
│  - revalidatePath / updateTag                                  │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│  lib/drizzle (DATABASE_URL)  │  lib/supabase (RLS)           │
│  - queries tipadas, bypass RLS │ - storage, auth admin, RLS    │
└─────────────────────────────────────────────────────────────┘
```

La app es **server-first**: la mayoría de las pantallas son Server Components que leen datos directamente (sin fetch a una API interna) y las mutaciones se hacen con Server Actions.

---

## 2. Roles y portales

El enum `role` (tabla `profiles`) tiene 4 valores, cada uno con su propio árbol de rutas en `app/(dashboard)/`:

| Rol | Portal | Alcance |
|-----|--------|---------|
| `director` | `/director/*` | Acceso total: usuarios, docentes, cursos, marketing, evaluaciones docentes, promociones, cierre de ciclo, y todo lo operativo |
| `administrativo` | `/administrativo/*` | Operación diaria: alumnos, inscripciones, asistencia, notas, pagos, reclamos, notificaciones, reportes |
| `profesor` | `/profesor/*` | Sus cursos, asistencia, notas, autoevaluaciones IA, documentos |
| `alumno` | `/alumno/*` | Su asistencia, notas, autoevaluaciones, documentos, pagos, reclamos |

Históricamente el rol `director` se llamó `admin` (ver `lib/drizzle/migrations/0002_rename_admin_to_director.sql`). `getServerProfile()` normaliza perfiles viejos que todavía tengan `role = "admin"` a `"director"` por compatibilidad. No existe un rol `tutor`.

`administrativo` comparte casi todas las rutas de `/director`, pero `proxy.ts` bloquea con un redirect a `/403` las secciones exclusivas de dirección (`ADMIN_ONLY_ROUTES` en `proxy.ts`): usuarios, docentes, cursos, evaluaciones docentes, autoevaluaciones IA, cierre de ciclo, marketing, promociones y perfil de dirección.

---

## 3. Autenticación y autorización

### 3.1 `proxy.ts` (reemplaza `middleware.ts`)

- Corre en el Edge Runtime antes de cada request a una ruta no estática.
- Llama a `supabase.auth.getUser()`, que valida el JWT contra Supabase (llamada de red real) y refresca el token si hace falta.
- Si la ruta es protegida (`/director`, `/administrativo`, `/profesor`, `/alumno`) y no hay usuario → redirect a `/login`.
- Si la ruta empieza con `/director` y el rol del usuario es `administrativo` y la ruta está en `ADMIN_ONLY_ROUTES` → redirect a `/403`.

### 3.2 `lib/auth/helpers.ts`

```typescript
// Lee el JWT de la cookie localmente, sin llamada de red.
// Es seguro porque proxy.ts ya validó el token con getUser().
export const getServerUser = cache(async () => { ... });

// Lee el perfil (profiles) del usuario actual.
export const getServerProfile = cache(async () => { ... });

// Lanza Error("Unauthorized") si el rol no está en la lista permitida.
export async function requireRole(allowedRoles: UserRole[]) { ... }
```

`cache()` de React deduplica estas llamadas dentro del mismo árbol de render (RSC), así que se pueden llamar desde varios componentes/layouts sin costo extra.

**Regla de oro:** `requireRole()` es la **única** capa de autorización para Server Actions — siempre va primero, antes de validar el formulario.

### 3.3 Row Level Security (RLS) en Supabase

Las tablas en Supabase tienen RLS habilitado. Hay dos formas de acceder a los datos, con dos modelos de seguridad distintos:

- **Drizzle (`DATABASE_URL`)**: usa la conexión directa a Postgres con el rol de servicio → **bypassea RLS**. La autorización la da `requireRole()` en el Server Action, no la base de datos.
- **Cliente Supabase (`@supabase/ssr`, `lib/supabase/server.ts` / `client.ts`)**: respeta RLS según el JWT del usuario. Se usa para Auth, Storage y algunas lecturas desde el cliente.

Para evitar recursión infinita al evaluar políticas sobre `profiles`, existe la función `current_user_role()` (`SECURITY DEFINER`, ver `lib/drizzle/migrations/0004_profiles_select_policies.sql`), que lee el rol del usuario actual sin volver a disparar RLS. Las policies la envuelven en `(select public.current_user_role())` para que Postgres la evalúe **una sola vez por query** (initplan) en lugar de una vez por fila — evita timeouts en tablas grandes.

---

## 4. Server Actions

Toda mutación es una Server Action en `modules/<dominio>/actions.ts`. Patrón:

1. `await requireRole([...])` — autorización.
2. `schema.safeParse(raw)` — validación con Zod (`schemas.ts`). Si falla, devuelve `{ error, fieldErrors }`.
3. Lógica de negocio vía `services/<dominio>.service.ts` (Drizzle).
4. `revalidatePath(...)` (y/o `updateTag(...)`) para invalidar caché de Next.js.
5. Devuelve `ActionResult` (`{ error?, success?, redirectTo?, fieldErrors? }`).

En el cliente, `useActionState` + `<FormButton>` conectan el formulario a la action, muestran toasts (Sonner) según `state.error` / `state.success`, y redirigen si `state.redirectTo` está presente.

---

## 5. Caching

- `revalidatePath(path)` — invalida el caché de una ruta puntual después de una mutación.
- `updateTag(tag)` — invalida datos cacheados con `unstable_cache(..., { tags: [...] })` (ver `lib/query-cache.ts`, usado para listados de profesores/alumnos en selects de formularios).
- `unstable_cache` con `revalidate: false` — cachea indefinidamente hasta que se llama `updateTag`.

---

## 6. Acceso a archivos (Storage)

Los uploads (avatares, documentos) usan `createServiceClient()` (`lib/supabase/service.ts`, service role key) desde Server Actions — nunca el cliente browser. El bucket `avatars` es público; las URLs son del tipo `https://[proyecto].supabase.co/storage/v1/object/public/avatars/[userId]/avatar.[ext]`.

---

## 7. Módulos de IA

`modules/assessments` usa `@anthropic-ai/sdk` para generar preguntas de autoevaluación por curso. Las preguntas se guardan en JSONB (`assessments.questions`), con la forma:

```typescript
{ question: string; options: string[]; correct: number; explanation: string }
```

---

## 8. Despliegue

- **Vercel**, deploy automático al pushear a `main`.
- Dominio: `cervantes-smart-learning.com.ar`.
- Variables de entorno (Supabase, `DATABASE_URL`, Resend, Anthropic) configuradas en Vercel por entorno (production/preview).
