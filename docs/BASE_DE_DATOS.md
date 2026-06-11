# Base de datos

PostgreSQL gestionado por Supabase. Acceso tipado vía Drizzle ORM (`src/lib/drizzle/schema.ts`); Auth, Storage y algunas lecturas vía cliente Supabase.

---

## 1. Tablas

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Extensión de `auth.users` — `email`, `role`, `full_name`, `phone`, `avatar_url` |
| `students` | Alumnos — `dni`, `birth_date`, `level`, `placement_test_score`, `status` |
| `teachers` | Docentes — `dni`, `specialization` |
| `courses` | Cursos — `level`, `schedule`, `max_capacity` (15), `teacher_id`, `status` |
| `enrollments` | Relación alumno-curso |
| `attendance` | Asistencia por clase — `present` / `absent` / `late` |
| `grades` | Notas (1-10) por tipo de evaluación |
| `payments` | Pagos mensuales — vencimiento día 10 |
| `notifications` | Mensajes internos por usuario |
| `complaints` | Reclamos/tickets |
| `assessments` | Autoevaluaciones IA por curso (`questions` en JSONB) |
| `assessment_attempts` | Respuestas del alumno a una `assessment` |
| `documents` | Material/documentos por curso (Storage) |
| `marketing_campaigns` | Campañas publicitarias |
| `inquiries` | Consultas de potenciales alumnos |
| `teacher_surveys` | Evaluaciones anónimas de docentes |
| `class_observations` | Observaciones de clase por dirección |

## 2. Enums (`pgEnum`)

| Enum | Valores |
|------|---------|
| `role` | `director`, `administrativo`, `profesor`, `alumno` |
| `student_status` | `active`, `inactive`, `suspended`, `graduated` |
| `course_status` | `active`, `inactive`, `completed` |
| `enrollment_status` | `active`, `completed`, `withdrawn` |
| `attendance_status` | `present`, `absent`, `late` |
| `payment_status` | `pending`, `paid`, `overdue`, `suspended` |
| `payment_method` | `cash`, `transfer`, `card` |
| `marketing_channel` | `social_media`, `email`, `flyers`, `word_of_mouth`, `website`, `other` |
| `inquiry_status` | `pending`, `enrolled`, `lost` |
| `notification_type` | `absence`, `payment`, `grade`, `general`, `alert` |
| `complaint_type` | `academic`, `administrative`, `infrastructure`, `teacher` |
| `complaint_status` | `open`, `in_progress`, `resolved`, `closed` |
| `level` | `beginner`, `elementary`, `pre_intermediate`, `intermediate`, `upper_intermediate`, `advanced` |
| `evaluation_type` | `parcial`, `final`, `oral`, `homework`, `quiz` |
| `assessment_status` | `draft`, `published`, `archived` |

> El enum `level` se muestra siempre traducido vía `LEVEL_LABELS` (`src/lib/level-labels.ts`), nunca en inglés en la UI.

---

## 3. Reglas de negocio

- Cupo máximo por curso: **15 alumnos**.
- Asistencia mínima para promoción: **80%**.
- Nota mínima para promoción: **7/10**.
- Vencimiento de pagos: **día 10** de cada mes.
- Ban de usuarios en Supabase Auth: duración `"87600h"` (10 años) — equivale a deshabilitar la cuenta.

---

## 4. Drizzle vs cliente Supabase

| | Drizzle (`lib/drizzle`) | Cliente Supabase (`lib/supabase`) |
|---|---|---|
| Conexión | `DATABASE_URL` (postgres-js, `max: 1`, `prepare: false` para el pooler en modo transacción de Supabase) | REST/Auth API con JWT del usuario |
| RLS | **Bypassea RLS** — la autorización la da `requireRole()` | Respeta RLS según el usuario autenticado |
| Uso | Queries de dominio en `services/*.service.ts` | Auth (`auth.admin.*`), Storage, lecturas puntuales desde cliente |
| Cuándo usar | Por defecto, para todo lo que sea lectura/escritura de datos de negocio | Login/sesión, subir archivos, operaciones que dependen de RLS |

Como Drizzle bypassea RLS, **toda la autorización de los módulos de dominio depende de `requireRole()`** en el Server Action correspondiente — las policies de RLS no son una segunda barrera para esas tablas.

---

## 5. Row Level Security

RLS está habilitado en las tablas accedidas por el cliente Supabase (principalmente `profiles`, para Auth y joins anidados desde el cliente).

### `current_user_role()`

```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;
```

- `SECURITY DEFINER` → corre con los permisos del owner de la función, evitando que la policy sobre `profiles` se vuelva a evaluar a sí misma (recursión infinita).
- Las policies la usan envuelta en `(select public.current_user_role())`, no `public.current_user_role()` a secas. Esto le permite a Postgres evaluarla **una vez por query** (initplan) en lugar de una vez por fila — sin el `(select ...)`, en tablas grandes esto causaba timeouts.

### Policies sobre `profiles`

- `authenticated_select_own_profile` — cada usuario lee su propio perfil (`auth.uid() = id`).
- `staff_select_all_profiles` — `director`/`administrativo`/`profesor` leen todos los perfiles.
- `authenticated_select_teacher_profiles` — cualquier usuario autenticado puede leer perfiles con `role = 'profesor'` (nombres de docentes se muestran en cursos/evaluaciones, no son sensibles).

---

## 6. Migraciones

Las migraciones viven en `src/lib/drizzle/migrations/*.sql` como **SQL escrito a mano** (no generadas con `drizzle-kit generate` — no hay carpeta `meta/` con journal). Se aplican manualmente contra Supabase (Dashboard SQL editor o MCP de Supabase), documentando en cada archivo el ticket de Jira asociado y el motivo del cambio.

| Migración | Qué hace |
|-----------|----------|
| `0001_add_administrativo_role.sql` | Agrega el valor `administrativo` al enum `role` |
| `0002_rename_admin_to_director.sql` | Renombra el valor `admin` → `director` en el enum `role` |
| `0003_add_documents.sql` | Crea la tabla `documents` |
| `0004_profiles_select_policies.sql` | Agrega `current_user_role()` y policies de SELECT sobre `profiles` para staff y para perfiles de docentes |

`drizzle-kit` (`pnpm db:generate` / `db:push` / `db:studio`) se usa para mantener `schema.ts` sincronizado y para explorar la base, pero los cambios de schema reales se aplican vía estos archivos SQL.

---

## 7. Variables de entorno relevantes

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # mismo valor que ANON_KEY
SUPABASE_SECRET_KEY=                    # service_role — bypassea RLS, usar solo en server
DATABASE_URL=postgresql://...?sslmode=require
```
