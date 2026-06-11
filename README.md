# Smart Learning

Sistema de gestión académica para institutos de inglés, desarrollado como tesis de **Analista de Sistemas de Computación** (Institución Cervantes, Córdoba, Argentina). Desplegado en Vercel bajo el dominio `cervantes-smart-learning.com.ar`.

## Stack

| Tecnología | Uso |
|------------|-----|
| [Next.js](https://nextjs.org) 16 (App Router) | Framework principal, server-first |
| [React](https://react.dev) 19 | UI |
| [TypeScript](https://www.typescriptlang.org) | Lenguaje |
| [Tailwind CSS](https://tailwindcss.com) 4 | Estilos |
| [Supabase](https://supabase.com) (`@supabase/ssr`) | Auth + Storage + PostgreSQL |
| [Drizzle ORM](https://orm.drizzle.team) | Queries tipadas sobre la base de datos |
| [Resend](https://resend.com) | Emails transaccionales (invitaciones) |
| [Lucide React](https://lucide.dev) | Iconos |
| [Sonner](https://sonner.emilkowal.ski) | Notificaciones toast |
| [Zod](https://zod.dev) | Validación de schemas |
| [Anthropic SDK](https://docs.anthropic.com) | Generación de autoevaluaciones con IA |
| [Vitest](https://vitest.dev) + [Playwright](https://playwright.dev) | Tests unitarios y E2E |
| [pnpm](https://pnpm.io) | Package manager |

## Empezar

```bash
pnpm install
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Variables de entorno necesarias (ver `.env.local.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ANTHROPIC_API_KEY=
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm lint` | ESLint |
| `pnpm tsc --noEmit` | Chequeo de tipos |
| `pnpm test` / `pnpm test:watch` | Tests unitarios (Vitest) |
| `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:push` / `pnpm db:studio` | Migraciones Drizzle |

## Roles del sistema

La app tiene 4 roles (`role` enum en `profiles`), cada uno con su propio portal dentro de `(dashboard)`:

- **`director`** — dirección del instituto. Acceso a todos los módulos, incluyendo gestión de usuarios, marketing, evaluaciones docentes, promociones y cierre de año lectivo.
- **`administrativo`** — personal administrativo. Gestión operativa diaria: alumnos, inscripciones, asistencia, notas, pagos, reclamos, notificaciones, reportes.
- **`profesor`** — docentes. Sus cursos, asistencia, notas, autoevaluaciones IA, documentos y notificaciones.
- **`alumno`** — estudiantes. Su asistencia, notas, autoevaluaciones, documentos, pagos, reclamos y notificaciones.

## Estructura del proyecto

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Páginas públicas: login, invite, forgot-password, update-password
│   ├── (dashboard)/               # Páginas protegidas por rol
│   │   ├── layout.tsx            # Layout compartido — lee el perfil del usuario
│   │   ├── director/             # Portal dirección
│   │   ├── administrativo/       # Portal administrativo
│   │   ├── profesor/             # Portal docente
│   │   └── alumno/                # Portal alumno
│   ├── api/reports/               # Endpoints de exportación (Excel)
│   ├── 403/                       # Página de acceso denegado
│   └── layout.tsx                 # Root layout — metadata, fuentes, Toaster
│
├── components/
│   ├── ui/                        # Primitivos reutilizables (Button, Input, Badge, Card, FormButton, ConfirmDialog, skeletons)
│   └── shared/                    # DashboardShell, Sidebar, Topbar
│
├── lib/
│   ├── supabase/                  # Clientes Supabase (browser, server, admin, service role)
│   ├── drizzle/                   # Conexión, schema y migraciones
│   ├── auth/                      # getServerUser, getServerProfile, requireRole
│   ├── email.ts                   # Envío de emails de invitación (Resend)
│   ├── excel.ts                   # Generación de reportes Excel
│   ├── level-labels.ts            # Labels en español para niveles de inglés
│   ├── action-result.ts           # Tipo ActionResult de las Server Actions
│   ├── query-cache.ts             # Cache de queries
│   └── utils/
│
├── modules/                        # Módulos de dominio (actions, schemas, services, components)
│   ├── auth, users, students, teachers, courses, enrollments
│   ├── attendance, grades, payments, notifications, complaints
│   ├── assessments, documents, promotions, year-end
│   ├── teacher-evaluations, marketing, reports, profile
│
└── proxy.ts                        # Protección de rutas (reemplaza middleware.ts en Next.js 16)
```

## Arquitectura

### Auth y rutas protegidas

- `proxy.ts` corre en el Edge Runtime antes de cada request, valida la sesión con Supabase y redirige a `/login` si no hay usuario autenticado en rutas de `(dashboard)`.
- `getServerUser()` / `getServerProfile()` (en `lib/auth/helpers.ts`) leen la sesión/perfil sin hacer una llamada de red extra, ya que `proxy.ts` validó el token.
- `requireRole(["..."])` se llama al inicio de **todo** Server Action para autorizar por rol.

### Server Actions

Toda mutación se hace vía Server Actions (`actions.ts` por módulo), que:
1. Validan el rol con `requireRole()`.
2. Validan el payload con un schema Zod (`schemas.ts`).
3. Ejecutan la lógica contra la base usando el `service` del módulo.
4. Devuelven un `ActionResult` (`{ error?, success?, redirectTo? }`) y revalidan el path.

### Base de datos (Supabase + Drizzle)

Tablas principales: `profiles`, `students`, `teachers`, `courses`, `enrollments`, `attendance`, `grades`, `payments`, `notifications`, `complaints`, `assessments`, `assessment_attempts`, `documents`, `marketing_campaigns`, `inquiries`, `teacher_surveys`, `class_observations`.

Reglas de negocio principales:
- Cupo máximo por curso: 15 alumnos.
- Asistencia mínima para promoción: 80%.
- Nota mínima para promoción: 7/10.
- Vencimiento de pagos: día 10 de cada mes.

### Invitación de usuarios

1. Se crea el usuario en Supabase Auth (`email_confirm: true`, sin email automático de Supabase).
2. Se genera un link `/invite/[base64url(email)]` y se envía por Resend.
3. El usuario activa su cuenta y define contraseña en `/update-password`.

### IA — Autoevaluaciones

El módulo `assessments` usa `@anthropic-ai/sdk` para generar preguntas de autoevaluación por curso, almacenadas en JSONB (`assessments.questions`).

## Tests

- **Unitarios**: Vitest, en `src/__tests__`.
- **End-to-end**: Playwright, en `tests/e2e`.

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — capas, auth/RLS, Server Actions, caching.
- [docs/CONVENCIONES.md](docs/CONVENCIONES.md) — estructura de módulos, patrones de código y UI, qué no hacer.
- [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md) — tablas, enums, reglas de negocio, RLS y migraciones.
- [CONTEXT.md](CONTEXT.md) — contexto general del proyecto (tesis, equipo, metodología).

## Deploy

La app se despliega en [Vercel](https://vercel.com). El build de producción corre `next build`; las migraciones de base de datos se aplican con `pnpm db:migrate` contra la `DATABASE_URL` de Supabase.
