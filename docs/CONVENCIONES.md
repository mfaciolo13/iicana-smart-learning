# Convenciones y buenas prácticas

Guía de patrones de código del proyecto. El objetivo es que los módulos nuevos sean predecibles: alguien que conoce un módulo (p. ej. `students`) puede orientarse en cualquier otro (`teachers`, `courses`, etc.) sin sorpresas.

---

## 1. Estructura de un módulo

```
modules/[nombre]/
├── actions.ts                # Server Actions ("use server") — mutaciones
├── schemas.ts                 # Schemas Zod para validación de inputs
├── types.ts                   # Tipos TypeScript del módulo (resultados de queries, etc.)
├── services/
│   └── [nombre].service.ts    # Queries a la DB con Drizzle
└── components/
    ├── [Nombre]List.tsx        # Tabla con listado
    ├── [Nombre]Form.tsx         # Formulario de alta/edición
    └── ...
```

- Las **páginas** (`app/(dashboard)/<rol>/...`) son las que orquestan: piden datos al `service` y renderizan los componentes del módulo.
- Los **services** solo hacen queries (Drizzle) y devuelven datos tipados — no validan rol ni input.
- Las **actions** son la única puerta de entrada para mutaciones desde la UI.

---

## 2. Server Actions

```typescript
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireRole } from "@/lib/auth/helpers";
import { createXSchema } from "./schemas";
import { createX } from "./services/x.service";
import type { ActionResult } from "@/lib/action-result";

export async function createXAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  // 1. Autorización — siempre primero
  await requireRole(["director", "administrativo"]);

  // 2. Validación con Zod
  const raw = { name: formData.get("name") as string };
  const parsed = createXSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      error: parsed.error.issues[0].message,
      fieldErrors: Object.fromEntries(
        Object.entries(flat).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]).filter(([, v]) => v)
      ) as Record<string, string>,
    };
  }

  // 3. Lógica de negocio
  await createX(parsed.data);

  // 4. Invalidar caché
  updateTag("x");
  revalidatePath("/director/x");
  revalidatePath("/administrativo/x");

  // 5. Resultado
  return { success: "Creado correctamente", redirectTo: "/director/x" };
}
```

`ActionResult`:

```typescript
type ActionResult = { error?: string; success?: string; redirectTo?: string; fieldErrors?: Record<string, string> } | undefined;
```

**Reglas:**

- `requireRole()` va primero, sin excepciones.
- Revalidar **todos** los paths que muestran ese dato (típicamente `/director/...` y `/administrativo/...` para módulos compartidos).
- Si un módulo tiene rutas en varios portales (p. ej. `attendance` en `director`, `administrativo` y `profesor`), revalidar las tres.

---

## 3. Validación con Zod (`schemas.ts`)

- Un schema `createXSchema` para alta, y `updateXSchema = createXSchema.partial().extend({ id: z.uuid(), ... })` para edición.
- Mensajes de error siempre en español.
- `z.coerce.number()` para campos numéricos que vienen de `FormData` (siempre strings).
- Enums de Postgres (`level`, `status`, etc.) se repiten como `z.enum([...])` en el schema — deben coincidir con los valores del `pgEnum` correspondiente en `lib/drizzle/schema.ts`.

---

## 4. UI

### 4.1 Formularios

- `useActionState(action, undefined)` + `<FormButton action={...}>` para acciones simples (delete, cambios de estado).
- `FormButton` ya maneja: estado `pending`, toasts de éxito/error (Sonner), redirect post-éxito, y un `ConfirmDialog` opcional vía `confirmMessage`.
- Para formularios con muchos campos, usar `useActionState` directamente en el componente del formulario para tener control fino sobre `fieldErrors`.

### 4.2 Tablas con filas clickeables

```tsx
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

### 4.3 Navegación

```tsx
// Back — siempre ArrowLeft
<Link href="/director/users" className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
  <ArrowLeft className="w-3.5 h-3.5" /> Usuarios
</Link>

// Forward — ArrowRight
<Link href="/ruta" className="inline-flex items-center gap-1">
  Ver detalle <ArrowRight className="w-3.5 h-3.5" />
</Link>
```

### 4.4 Niveles de inglés

Nunca hardcodear "beginner"/"Principiante" etc. Siempre:

```typescript
import { LEVEL_LABELS } from "@/lib/level-labels";

LEVEL_LABELS[course.level] ?? course.level
```

### 4.5 Responsive

- Tablas: `overflow-x-auto` en el contenedor.
- Columnas secundarias: `hidden md:table-cell`.
- Sidebar: drawer responsive (`Sidebar.tsx`), navegación por rol definida en `NAV_ITEMS`.

### 4.6 Iconos, toasts y diálogos

- Solo **Lucide React** para iconos.
- Solo **Sonner** (`toast.success` / `toast.error`) para feedback — nunca `alert()`.
- `ConfirmDialog` para confirmaciones — nunca `confirm()`/`prompt()`.

---

## 5. Acceso a datos

- **Drizzle siempre** para queries del lado del servidor en módulos de dominio (`db.select(...).from(...)`). No SQL raw.
- Joins explícitos con `innerJoin` / `leftJoin` + `eq()` de `drizzle-orm` — no relaciones implícitas.
- `createServiceClient()` (Supabase service role) solo para Storage (avatares, documentos) y para los listados cacheados de `lib/query-cache.ts`.
- `createAdminClient()` (Supabase admin) solo para operaciones de Auth (crear/banear usuarios, generar links de invitación).

---

## 6. Lo que NUNCA se hace

- `middleware.ts` — está deprecado en Next.js 16, usar `proxy.ts`.
- Llamar `supabase.auth.getUser()` en páginas/layouts — ya lo hace `proxy.ts`; usar `getServerUser()` / `getServerProfile()`.
- Texto hardcodeado en español para niveles ("Principiante", etc.) fuera de `LEVEL_LABELS`.
- Crear clientes Supabase de servidor (`lib/supabase/server.ts`) para Storage — usar `createServiceClient()`.
- Hardcodear referencias a "IICANA" — el branding del producto es "Smart Learning".
- `prompt()` / `alert()` / `confirm()` nativos.
- SQL raw donde Drizzle puede expresar la query.
- Agregar un nuevo Server Action sin `requireRole()` como primera línea.

---

## 7. Verificación antes de commitear

```bash
pnpm tsc --noEmit   # tipos
pnpm lint           # ESLint
pnpm test           # Vitest (src/__tests__)
```

Tests E2E (Playwright) viven en `tests/e2e` y usan usuarios creados por `scripts/create-e2e-users.ts`.
