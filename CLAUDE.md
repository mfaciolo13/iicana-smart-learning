@AGENTS.md

# Smart Learning — Contexto para Claude Code

Sistema de gestión académica para institutos de inglés. Tesis de Analista de Sistemas (Institución Cervantes, Córdoba, Argentina). Desplegado en Vercel, dominio `cervantes-smart-learning.com.ar`.

---

## Stack

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 16.2.4 | Framework principal (App Router, server-first) |
| React | 19 | UI |
| TypeScript | 5 | Lenguaje |
| Tailwind CSS | 4 | Estilos |
| Supabase | @supabase/ssr 0.10 | Auth + Storage + PostgreSQL |
| Drizzle ORM | 0.45 | Queries tipadas sobre PostgreSQL de Supabase |
| Resend | 6 | Envío de emails transaccionales |
| Lucide React | 1.14 | Iconos (ÚNICO sistema de iconos del proyecto) |
| Sonner | 2 | Toast notifications |
| Zod | 4 | Validación de schemas |
| pnpm | — | Package manager |

---

## Arquitectura

### Organización de carpetas

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Páginas públicas: login, invite, update-password
│   ├── (dashboard)/              # Páginas protegidas por rol
│   │   ├── layout.tsx            # Layout compartido — lee perfil del usuario
│   │   ├── director/             # Portal dirección (acceso total)
│   │   ├── administrativo/       # Portal personal administrativo
│   │   ├── profesor/             # Portal docente
│   │   └── alumno/               # Portal alumno
│   ├── api/                      # API Routes (reportes Excel)
│   ├── layout.tsx                # Root layout — metadata, fuentes, Toaster
│   ├── icon.svg                  # Favicon (Next.js lo usa automáticamente)
│   └── page.tsx                  # Redirect a /login
│
├── components/
│   ├── ui/                       # Primitivos reutilizables
│   │   ├── Button.tsx            # Botón con variantes (primary/secondary/danger/ghost)
│   │   ├── Input.tsx             # Input, Field, Select
│   │   ├── Badge.tsx             # Badge con variantes de color
│   │   ├── Card.tsx              # Card con título opcional
│   │   ├── FormButton.tsx        # Botón que ejecuta Server Actions con toast
│   │   └── ConfirmDialog.tsx     # Dialog de confirmación
│   └── shared/                   # Componentes de layout de la app
│       ├── DashboardShell.tsx    # Shell con sidebar + topbar
│       ├── Sidebar.tsx           # Navegación lateral (responsive drawer en mobile)
│       └── Topbar.tsx            # Barra superior con avatar y dropdown
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser (componentes client-side)
│   │   ├── server.ts             # Cliente server (RSC, Server Actions)
│   │   ├── admin.ts              # Cliente admin (service role, operaciones auth)
│   │   └── service.ts            # Cliente service role (Storage uploads)
│   ├── drizzle/
│   │   ├── index.ts              # Instancia de db (drizzle + postgres)
│   │   ├── schema.ts             # Schema completo (tablas, enums, tipos)
│   │   └── migrations/           # Archivos SQL generados por drizzle-kit
│   ├── auth/
│   │   └── helpers.ts            # getServerUser, getServerProfile, requireRole
│   ├── email.ts                  # sendInvitationEmail (via Resend)
│   ├── level-labels.ts           # Labels en español para niveles de inglés
│   ├── action-result.ts          # Tipo ActionResult para Server Actions
│   └── cn.ts                     # Utility para clases Tailwind (clsx + tailwind-merge)
│
├── modules/                      # Módulos de dominio
│   ├── auth/
│   ├── users/
│   ├── students/
│   ├── teachers/
│   ├── courses/
│   ├── enrollments/
│   ├── attendance/
│   ├── grades/
│   ├── payments/
│   ├── notifications/
│   ├── complaints/
│   ├── promotions/
│   ├── assessments/              # Autoevaluaciones IA (usa @anthropic-ai/sdk)
│   ├── teacher-evaluations/
│   ├── marketing/
│   ├── year-end/
│   ├── reports/
│   └── profile/
│
└── proxy.ts                      # Protección de rutas (reemplaza middleware.ts)
```

### Estructura de cada módulo

```
modules/[nombre]/
├── actions.ts          # Server Actions ("use server") — mutaciones
├── schemas.ts          # Schemas Zod para validación
├── types.ts            # TypeScript types del módulo
├── services/
│   └── [nombre].service.ts   # Queries a la DB (Drizzle)
└── components/
    ├── [Nombre]List.tsx       # Tabla con listado
    ├── [Nombre]Form.tsx       # Formulario de alta/edición
    └── ...
```

---

## Auth y protección de rutas

### proxy.ts (NO es middleware.ts — ese está deprecado en Next.js 16)

- Se ejecuta en Edge Runtime antes de cada request
- Llama a `supabase.auth.getUser()` para validar el token (llamada de red real)
- Redirige a `/login` si el usuario no está autenticado en rutas protegidas
- Las rutas protegidas son: `/director`, `/administrativo`, `/profesor`, `/alumno`
- Dentro de `/director`, bloquea al rol `administrativo` de las secciones exclusivas de dirección (usuarios, docentes, cursos, marketing, etc.) redirigiendo a `/403`

### helpers.ts

```typescript
// getSession() lee el JWT de la cookie localmente — sin llamada de red
// Es seguro porque proxy.ts ya validó el token
export const getServerUser = cache(async () => { ... })

// Lee el perfil de la tabla profiles
export const getServerProfile = cache(async () => { ... })

// Lanza error si el rol no está permitido — usar en TODOS los Server Actions
export async function requireRole(allowedRoles: UserRole[]) { ... }
```

**Importante:** `getServerUser` usa `getSession()` (no `getUser()`) para evitar una llamada de red en cada página. Esto es intencional y seguro porque el proxy ya validó.

### Uso en páginas y layouts

```typescript
// En layout.tsx del dashboard:
const profile = await getServerProfile();

// En Server Actions:
await requireRole(["director", "administrativo"]); // lanza si el rol no está permitido

// En páginas que necesitan el usuario:
const user = await getServerUser();
if (!user) notFound();
```

---

## Server Actions

Toda mutación usa Server Actions. Patrón estándar:

```typescript
// actions.ts
"use server";
import { requireRole } from "@/lib/auth/helpers";
import type { ActionResult } from "@/lib/action-result";

export async function createXAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]); // siempre primero
  
  // Validar con Zod
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  
  // Ejecutar lógica
  await service.create(parsed.data);
  
  revalidatePath("/director/x");
  revalidatePath("/administrativo/x");
  return { success: "Creado correctamente", redirectTo: "/director/x" };
}
```

```typescript
// ActionResult type
type ActionResult = { error?: string; success?: string; redirectTo?: string } | undefined;
```

**En UI:** usar `FormButton` para acciones simples, `useActionState` directamente para formularios complejos.

---

## Patrones de UI

### Tablas con filas clickeables

```tsx
// Fila completa clickeable + ojo como indicador visual
<tr className="hover:bg-brand-50 transition-colors relative group cursor-pointer">
  <td>contenido</td>
  <td className="py-3.5 pr-4 text-right">
    {/* stretched link: cubre toda la fila via ::after */}
    <Link href="/ruta/id" className="after:absolute after:inset-0 after:content-['']">
      <Eye className="w-4 h-4 text-slate-300 group-hover:text-brand-700 transition-colors" />
    </Link>
  </td>
</tr>
```

### Back links y forward links

```tsx
// Back — siempre ArrowLeft de lucide-react
<Link href="/director/users" className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
  <ArrowLeft className="w-3.5 h-3.5" /> Usuarios
</Link>

// Forward — ArrowRight de lucide-react
<Link href="/ruta" className="inline-flex items-center gap-1">
  Ver detalle <ArrowRight className="w-3.5 h-3.5" />
</Link>
```

### Branding, tipografía y color

La identidad visual está documentada en `docs/IDENTIDAD_VISUAL.md`. Resumen:

- **Logo:** siempre desde `@/components/shared/Logo` (`Logo`, `LogoMark`, `Wordmark`). No dibujar el SVG a mano ni usar `<img>`. El favicon `app/icon.svg` es el mismo dibujo.
- **Tipografía:** Manrope (`font-sans`) para la interfaz; Fraunces (`font-display`) para títulos. Los `h1` y `h2` ya salen en serif desde `globals.css`: no hace falta agregar `font-display` a los títulos de página. Sí usarlo para cifras grandes (`StatTile` ya lo hace).
- **Color:** la paleta vive en `@theme` de `globals.css`. `brand-*` es el azul institucional de IICANA (#2d5383) y `accent-*` el naranja (#e27c00); `red-*` (#bb4141), `emerald-*` y `amber-*` también salen de iicana.org. Las escalas `slate`, `emerald`, `amber`, `red`, `orange` y `violet` de Tailwind están **sobreescritas** con versiones cálidas: seguir usándolas con esos nombres. No usar `blue-*` (se reemplazó por `brand-*` en todo el código).
- **Indicadores numéricos:** usar `StatTile` de `@/components/ui/StatTile` en vez de tarjetas con cuadradito de color.
- **Páginas públicas (login, invitación, recuperación):** envolver con `AuthShell` de `@/components/shared/AuthShell`.
- **Gráficos:** colores desde `COLORS` en `src/components/charts/palette.ts`, nunca hex sueltos.

```tsx
import { Logo } from "@/components/shared/Logo";

<Logo size={36} textClassName="text-xl" />
```
### Niveles de inglés — siempre usar LEVEL_LABELS

```typescript
import { LEVEL_LABELS } from "@/lib/level-labels";
// { beginner: "Principiante", elementary: "Elemental", ... }

// Uso:
LEVEL_LABELS[course.level] ?? course.level
```

---

## Base de datos (Drizzle + Supabase PostgreSQL)

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Extensión de auth.users — email, role, full_name, avatar_url |
| `students` | Alumnos — dni, birth_date, level, status |
| `teachers` | Docentes — dni, specialization |
| `courses` | Cursos — level, schedule, max_capacity (15), teacher_id |
| `enrollments` | Relación alumno-curso |
| `attendance` | Asistencia por clase — present/absent/late |
| `grades` | Notas (1-10) por tipo de evaluación |
| `payments` | Pagos mensuales — vencimiento día 10 |
| `notifications` | Mensajes internos por usuario |
| `complaints` | Sistema de reclamos/tickets |
| `assessments` | Autoevaluaciones generadas por IA (questions en JSONB) |
| `assessment_attempts` | Respuestas del alumno |
| `documents` | Material/documentos compartidos por curso |
| `marketing_campaigns` | Campañas publicitarias |
| `inquiries` | Consultas de potenciales alumnos |
| `teacher_surveys` | Evaluaciones anónimas de docentes |
| `class_observations` | Observaciones de clase por dirección |

### Roles (`role` enum)

- `director` — dirección del instituto, acceso total
- `administrativo` — personal administrativo, acceso operativo (sin usuarios, docentes, cursos, marketing, evaluaciones docentes, promociones, cierre de ciclo)
- `profesor` — docentes
- `alumno` — estudiantes

**Nota histórica:** el rol se llamaba `admin` y fue renombrado a `director` (migración `0002_rename_admin_to_director.sql`); luego se agregó `administrativo` (migración `0001_add_administrativo_role.sql`, aplicada antes por orden de ejecución). No existe rol `tutor` — se descartó esa idea, los padres/tutores no tienen portal propio.

### Reglas de negocio en DB

- Cupo máximo de cursos: 15 alumnos
- Asistencia mínima para promoción: 80%
- Nota mínima para promoción: 7/10
- Vencimiento de pagos: día 10 de cada mes
- Ban de usuarios: duración "87600h" (10 años) en Supabase Auth

### Queries

```typescript
import { db } from "@/lib/drizzle";
import { students, profiles } from "@/lib/drizzle/schema";
import { eq, ilike } from "drizzle-orm";

// Ejemplo — siempre usar el ORM, nunca SQL raw
const rows = await db
  .select({ id: students.id, name: profiles.fullName })
  .from(students)
  .innerJoin(profiles, eq(students.profileId, profiles.id))
  .where(eq(students.status, "active"));
```

---

## Flujo de invitación de usuarios

1. Director/administrativo crea alumno/docente → `auth.admin.createUser({ email_confirm: true })` (sin email de Supabase)
2. Nuestro action genera el link `/invite/[base64url(email)]`
3. Resend envía el email con ese link
4. Usuario entra a `/invite/[encoded]` → genera un recovery link via `generateLink({ type: "recovery" })`
5. Usuario establece contraseña en `/update-password`
6. `last_sign_in_at` queda seteado → dirección ve "Activo" en el detalle del usuario

**Nota:** El flujo usa `type: "recovery"`, no confirmación de email. Por eso en `getUserDetail` se chequea `email_confirmed_at || last_sign_in_at` para determinar si el usuario ya activó su cuenta.

---

## Email (Resend)

```typescript
// Solo se usa para invitaciones — src/lib/email.ts
await sendInvitationEmail({ to, fullName, role, inviteLink });

// En desarrollo (NODE_ENV === "development") solo imprime en consola, no envía
// Variables necesarias:
// RESEND_API_KEY
// RESEND_FROM_EMAIL=Smart Learning <no-reply@cervantes-smart-learning.com.ar>
```

---

## Storage (Supabase)

```typescript
// Usar createServiceClient() para uploads desde Server Actions
import { createServiceClient } from "@/lib/supabase/service";

const supabase = createServiceClient();
const { data, error } = await supabase.storage
  .from("avatars")
  .upload(path, file, { upsert: true });
```

Bucket: `avatars` — acceso público. URLs del tipo `https://[proyecto].supabase.co/storage/v1/object/public/avatars/[userId]/avatar.[ext]`.

---

## Convenciones obligatorias

### Lo que SIEMPRE se hace

- `requireRole()` al inicio de todo Server Action
- `pnpm tsc --noEmit` para verificar tipos antes de commitear
- `LEVEL_LABELS` de `@/lib/level-labels` para mostrar niveles (nunca en español hardcodeado localmente)
- Iconos de Lucide React exclusivamente
- Responsive por defecto: tablas con `overflow-x-auto`, columnas secundarias con `hidden md:table-cell`
- `ArrowLeft` / `ArrowRight` de Lucide para navegación, `Eye` para ver detalle en tablas
- Stretched link (`after:absolute after:inset-0`) para filas de tabla clickeables

### Lo que NUNCA se hace

- No usar `middleware.ts` — está deprecado en Next.js 16, usar `proxy.ts`
- No llamar `supabase.auth.getUser()` en páginas/layouts (ya lo hace proxy.ts) — usar `getServerUser()`
- No texto directo en inglés para niveles ("beginner", "elementary") — usar `LEVEL_LABELS`
- No crear clientes Supabase con `createClient()` del servidor para Storage — usar `createServiceClient()`
- No hardcodear referencias a "IICANA" — el branding es "Smart Learning"
- No usar `prompt()` ni `alert()` — usar Sonner toast o modales

---

## Módulos IA (Assessments)

Las autoevaluaciones usan `@anthropic-ai/sdk` para generar preguntas via Claude API.  
El modelo usado es configurado en `src/modules/assessments/services/assessments.service.ts`.  
Las preguntas se guardan en JSONB en la tabla `assessments.questions`:

```typescript
// Forma de cada pregunta:
{ question: string; options: string[]; correct: number; explanation: string }
```

---

## Variables de entorno (resumen)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # mismo que ANON_KEY
SUPABASE_SECRET_KEY=                    # service_role key
DATABASE_URL=postgresql://...?sslmode=require
RESEND_API_KEY=
RESEND_FROM_EMAIL=Smart Learning <no-reply@cervantes-smart-learning.com.ar>
```

---

## Estado actual del proyecto (Mayo 2026)

### Implementado y funcional

- Auth completo (login, invite, update-password, logout)
- Dashboard por los 4 roles (`director`, `administrativo`, `profesor`, `alumno`) con sidebar responsive
- CRUD completo: alumnos, docentes, cursos, inscripciones, notas, pagos, reclamos
- Asistencia digital con registro por clase
- Evaluaciones docentes (encuestas + observaciones)
- Sistema de notificaciones internas
- Autoevaluaciones IA por curso
- Material/documentos por curso
- Promociones y cierre de ciclo lectivo
- Certificados de promoción (imprimibles)
- Recibos de pago (imprimibles)
- Marketing y seguimiento de consultas
- Reportes Excel (asistencia, notas, pagos)
- Perfil de usuario con foto de avatar
- Gestión de usuarios con ban/unban y reenvío de invitación
- Portal `profesor`: detalle de curso (`/profesor/courses/[id]`) y carga de notas (`/profesor/grades`)

### Pendiente / en progreso

- SCRUM-122: Badge de notificaciones no leídas en el campana del topbar
- SCRUM-123: DATABASE_URL en Vercel preview env usa puerto 5432 incorrecto
- SCRUM-124: Detalle de usuario en portal `director` muestra iniciales, no avatar real
