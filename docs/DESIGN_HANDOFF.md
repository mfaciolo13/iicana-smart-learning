# IICANA Smart Learning — Design Handoff

**Versión:** 1.0
**Fecha:** 2026-05-01
**Equipo:** Amaya Amilcar · Ferreyra Nicolas · Ferreyra Amiel · Faciolo Mayco
**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase + Drizzle

---

## 1. Overview

Sistema de gestión académica e institucional para IICANA filial Pueyrredón (instituto de inglés, Córdoba). Cubre los 10 procesos clave del instituto (inscripción, asistencia, notas, pagos, comunicación, etc.) atendiendo 4 perfiles de usuario:

| Rol | Foco principal | Densidad de UI |
|---|---|---|
| `admin` | Operación completa, KPIs, reportes | Alta — tablas, dashboards |
| `profesor` | Asistencia, notas, comunicación | Media — listas + formularios rápidos |
| `alumno` | Notas, asistencia, pagos, mensajes | Baja — vista lectura, móvil |
| `tutor` | Hijo/a a cargo, pagos, alertas | Baja — vista lectura, móvil |

**Decisiones que dirigen el diseño:**
1. Server-first (App Router): la mayoría de pantallas son server components, formularios usan Server Actions con `next-safe-action`.
2. Profesores y admin trabajan en desktop (oficina/aula). Alumnos y tutores principalmente en móvil. Diseño mobile-first solo para los flujos de alumno/tutor; desktop-first para admin/profesor.
3. Se prioriza productividad sobre estética: tablas densas, atajos de teclado, formularios cortos.

---

## 2. Design Tokens

Los tokens están pensados para mapear 1:1 a las clases utilitarias de Tailwind. Se exportan desde `src/lib/design-tokens.ts` y se referencian en `tailwind.config.ts`.

### 2.1 Color

#### Paleta institucional

| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `color-brand-50` | `#EFF6FF` | `blue-50` | Fondo de banners informativos |
| `color-brand-100` | `#DBEAFE` | `blue-100` | Estados hover sutiles |
| `color-brand-500` | `#3B82F6` | `blue-500` | Iconografía secundaria |
| `color-brand-700` | `#1D4ED8` | `blue-700` | **Primary** — botones, links, header |
| `color-brand-800` | `#1E40AF` | `blue-800` | Hover sobre primary |
| `color-brand-900` | `#1E3A8A` | `blue-900` | Texto sobre fondos brand-50 |

#### Paleta de acento

| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `color-accent-500` | `#F59E0B` | `amber-500` | CTAs secundarios, badges destacados |
| `color-accent-600` | `#D97706` | `amber-600` | Hover sobre accent |

#### Paleta semántica

| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `color-success-500` | `#10B981` | `emerald-500` | Pagos al día, asistencia OK, promoción |
| `color-success-50` | `#ECFDF5` | `emerald-50` | Fondo de banners de éxito |
| `color-warning-500` | `#F59E0B` | `amber-500` | Mora < 30d, asistencia 70-79% |
| `color-warning-50` | `#FFFBEB` | `amber-50` | Fondo de banners de advertencia |
| `color-danger-500` | `#EF4444` | `red-500` | Mora ≥ 30d, suspensión, ausencias |
| `color-danger-50` | `#FEF2F2` | `red-50` | Fondo de banners de error |
| `color-info-500` | `#0EA5E9` | `sky-500` | Notificaciones, eventos |

#### Paleta neutra

| Token | Hex | Tailwind | Uso |
|---|---|---|---|
| `color-bg` | `#F8FAFC` | `slate-50` | Fondo de página |
| `color-surface` | `#FFFFFF` | `white` | Fondo de cards y modales |
| `color-surface-2` | `#F1F5F9` | `slate-100` | Filas alternadas en tablas, hover |
| `color-border` | `#E2E8F0` | `slate-200` | Bordes de inputs y cards |
| `color-border-strong` | `#CBD5E1` | `slate-300` | Bordes con foco |
| `color-text` | `#0F172A` | `slate-900` | Texto primario |
| `color-text-muted` | `#475569` | `slate-600` | Texto secundario, labels |
| `color-text-subtle` | `#94A3B8` | `slate-400` | Placeholder, helpers |

**Contraste:** Todos los pares texto/fondo cumplen WCAG AA (≥ 4.5:1 para texto normal, ≥ 3:1 para texto grande). Verificado:
- `color-text` sobre `color-surface` → 16.1:1
- `color-text-muted` sobre `color-surface` → 7.2:1
- `white` sobre `color-brand-700` → 7.4:1
- `white` sobre `color-accent-500` → 2.6:1 ❌ — usar `color-text` sobre amber-500.

### 2.2 Tipografía

**Familia:** `Inter` (variable, `next/font/google`) con fallback a `system-ui`. Ligaduras desactivadas para tablas.

| Token | Tamaño | Weight | Line-height | Uso |
|---|---|---|---|---|
| `font-display-xl` | 36px / 2.25rem | 700 | 1.2 | Hero login |
| `font-heading-lg` | 28px / 1.75rem | 600 | 1.25 | Títulos de página |
| `font-heading-md` | 22px / 1.375rem | 600 | 1.3 | Títulos de sección |
| `font-heading-sm` | 18px / 1.125rem | 600 | 1.35 | Títulos de card |
| `font-body-lg` | 16px / 1rem | 400 | 1.5 | Texto en formularios |
| `font-body` | 14px / 0.875rem | 400 | 1.5 | Texto general |
| `font-body-sm` | 13px / 0.8125rem | 400 | 1.45 | Texto de ayuda, captions |
| `font-mono` | 13px | 500 | 1.4 | DNI, números de recibo, IDs |
| `font-label` | 12px / 0.75rem | 500 | 1.3 | Labels en mayúsculas (uppercase, letter-spacing 0.05em) |

### 2.3 Espaciado

Escala base 4px. Tailwind nativo.

| Token | px | Tailwind | Uso típico |
|---|---|---|---|
| `space-1` | 4 | `space-1` | Gap entre icono y label |
| `space-2` | 8 | `space-2` | Padding interno chips |
| `space-3` | 12 | `space-3` | Gap entre inputs adyacentes |
| `space-4` | 16 | `space-4` | Padding de card |
| `space-5` | 20 | `space-5` | — |
| `space-6` | 24 | `space-6` | Gap entre secciones de form |
| `space-8` | 32 | `space-8` | Margen vertical entre cards |
| `space-10` | 40 | `space-10` | Padding lateral del layout |
| `space-12` | 48 | `space-12` | Margen del header |

### 2.4 Radii, sombras, bordes

| Token | Valor | Uso |
|---|---|---|
| `radius-sm` | 4px | Chips, badges |
| `radius-md` | 8px | Inputs, botones |
| `radius-lg` | 12px | Cards |
| `radius-xl` | 16px | Modales |
| `radius-full` | 9999px | Avatares, dot indicators |
| `shadow-sm` | `0 1px 2px rgb(15 23 42 / 0.05)` | Cards en reposo |
| `shadow-md` | `0 4px 6px -1px rgb(15 23 42 / 0.1)` | Cards hover, dropdowns |
| `shadow-lg` | `0 10px 15px -3px rgb(15 23 42 / 0.1)` | Modales, popovers |
| `border-width` | 1px | Inputs, cards |
| `border-width-strong` | 2px | Foco visible |

### 2.5 Motion

| Token | Duración | Easing | Uso |
|---|---|---|---|
| `motion-fast` | 120ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Hover, focus de inputs |
| `motion-base` | 200ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Aparición de tooltips, sidebar collapse |
| `motion-slow` | 320ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Modales, slide-overs |
| `motion-page` | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Transiciones de página |

**Regla:** Todas las animaciones respetan `prefers-reduced-motion`. Si el usuario lo tiene activado, las duraciones se fuerzan a `0ms` excepto `opacity` (que sigue en 120ms para evitar saltos abruptos).

### 2.6 Z-index scale

| Token | Valor | Uso |
|---|---|---|
| `z-base` | 0 | Contenido por defecto |
| `z-sticky` | 10 | Header sticky, table headers |
| `z-dropdown` | 20 | Menús, autocompletes |
| `z-overlay` | 30 | Backdrop de modales |
| `z-modal` | 40 | Modales, slide-overs |
| `z-toast` | 50 | Notificaciones flotantes |

---

## 3. Layout & Breakpoints

### 3.1 Breakpoints

Coinciden con Tailwind por defecto.

| Breakpoint | Min-width | Audiencia esperada |
|---|---|---|
| `mobile` (default) | 0 | Alumno, tutor |
| `sm` | 640px | Tablet vertical |
| `md` | 768px | Tablet horizontal |
| `lg` | 1024px | Profesor en aula (notebook) |
| `xl` | 1280px | Admin en oficina |
| `2xl` | 1536px | Admin con monitor externo |

**Ancho máximo del contenido:** `max-w-screen-2xl` (1536px) en dashboards. Los formularios usan `max-w-2xl` (672px) para legibilidad.

### 3.2 Grid del Dashboard

```
┌───────────────────────────────────────────────────────────────┐
│  Header (height 64px, sticky)                                  │
├──────────┬────────────────────────────────────────────────────┤
│          │                                                     │
│          │                                                     │
│  Sidebar │  Main content                                       │
│  (240px  │  - padding-x: space-10 (40px) en lg+               │
│   fixed) │  - padding-x: space-4 (16px) en mobile             │
│          │  - padding-y: space-8 (32px)                       │
│          │  - max-width: 1456px (centrado)                    │
│          │                                                     │
└──────────┴────────────────────────────────────────────────────┘
```

**Mobile (<lg):** Sidebar colapsa a drawer. Header muestra hamburguesa. Bottom-nav opcional para alumno/tutor con 4 items.

### 3.3 Layout de Auth

Centrado, sin sidebar ni header.

```
┌───────────────────────────────────────┐
│                                       │
│       Logo IICANA (h: 48px)           │
│                                       │
│   ┌───────────────────────────┐       │
│   │  Card 480px x auto        │       │
│   │  - radius-xl              │       │
│   │  - shadow-md              │       │
│   │  - padding: space-10      │       │
│   └───────────────────────────┘       │
│                                       │
│   © IICANA Pueyrredón 2026            │
└───────────────────────────────────────┘
```

---

## 4. Component Library

Cada componente vive en `src/components/ui/<Name>.tsx`. Variantes implementadas con `class-variance-authority` (cva).

### 4.1 Button

| Variant | Background | Text | Border | Uso |
|---|---|---|---|---|
| `primary` (default) | `brand-700` | `white` | none | CTA principal |
| `secondary` | `white` | `brand-700` | `brand-700` 1px | CTA secundario |
| `ghost` | transparent | `text-muted` | none | Acciones de tabla |
| `danger` | `danger-500` | `white` | none | Eliminar, suspender |
| `link` | transparent | `brand-700` | none, underline | Navegación inline |

| Size | Height | Padding-x | Font |
|---|---|---|---|
| `sm` | 32px | space-3 | font-body-sm |
| `md` (default) | 40px | space-4 | font-body |
| `lg` | 48px | space-6 | font-body-lg |

**Estados:**
- Hover (primary): `bg-brand-800`, transición `motion-fast`.
- Focus visible: ring de 2px en `brand-500`, offset 2px.
- Disabled: opacidad 50%, cursor not-allowed, sin hover.
- Loading: spinner de 16px a la izquierda del label, label permanece visible, button disabled.

**Props:**
```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
} & ButtonHTMLAttributes<HTMLButtonElement>
```

### 4.2 Input / Select / Textarea

Usan `react-hook-form` + `Zod`. Wrapper común `<Field>` que maneja label, helper text y error.

```
┌─────────────────────────────────┐
│ DNI *                           │ ← label (font-label, text-muted)
│ ┌─────────────────────────────┐ │
│ │ 30.123.456                  │ │ ← input (h: 40px, padding-x: 12px)
│ └─────────────────────────────┘ │
│ Sin puntos ni guiones           │ ← helper (font-body-sm, text-subtle)
└─────────────────────────────────┘
```

**Estados:**
- Default: `border-color-border`, fondo `surface`.
- Hover: `border-color-border-strong`.
- Focus: `border-brand-700`, ring 2px `brand-500/20`.
- Error: `border-danger-500`, helper en `danger-500`, ícono de alerta a la derecha.
- Disabled: `bg-surface-2`, `text-text-subtle`, cursor not-allowed.
- Read-only: igual al disabled pero cursor default y se puede seleccionar texto.

**Validaciones tipo:**
- DNI: regex `/^\d{7,8}$/`, máscara visual `XX.XXX.XXX`.
- Email: zod `.email()`, lowercase automático.
- Teléfono: máscara `+54 9 351 1234567`.
- Score (notas): number, min 1, max 10, step 0.1.

### 4.3 Table

Las tablas son la pieza central de admin/profesor. Usar `@tanstack/react-table` para sorting/filtering en cliente cuando los datos quepan en una página; paginación servidor cuando >100 filas.

**Anatomía:**
```
┌────────────────────────────────────────────────────────────────┐
│  Toolbar — search, filters, "Nueva" (button primary)           │
├────────────────────────────────────────────────────────────────┤
│  ☐  Nombre ↓        DNI         Curso       Estado     Acciones│ ← header sticky
├────────────────────────────────────────────────────────────────┤
│  ☐  Pérez Juan      30.123.456  B1 Mañana   ● Activo   ⋮       │
│  ☐  García María    28.987.654  A2 Tarde    ● Activo   ⋮       │
│  ☐  ...                                                        │
├────────────────────────────────────────────────────────────────┤
│  Mostrando 1-25 de 187      [‹] 1 2 3 ... 8 [›]   25 ▾ por pág│
└────────────────────────────────────────────────────────────────┘
```

**Specs:**
- Row height: 56px (cómodo, una línea por celda).
- Header: sticky `z-sticky`, fondo `surface`, border-bottom `2px brand-700`.
- Filas alternadas: `bg-surface-2` en pares (zebra opcional, off por default).
- Hover row: `bg-brand-50`, transición `motion-fast`.
- Selección: checkbox a la izquierda, fila seleccionada `bg-brand-50` permanente.
- Acciones: kebab menu (`⋮`) con dropdown alineado a la derecha.

**Estado vacío:**
- Ilustración SVG simple (60x60).
- Título: "Aún no hay alumnos cargados" (font-heading-md).
- Descripción: explicación corta.
- CTA primary que abre el form de creación.

**Estado de carga:**
- Skeleton: 5-10 filas placeholder (gris `surface-2`, animación shimmer 1.5s linear infinite).
- No usar spinner sobre la tabla.

### 4.4 Card

Bloque base para agrupar contenido en dashboards.

```ts
type CardProps = {
  title?: string
  description?: string
  actions?: ReactNode    // botones en el header derecho
  footer?: ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'  // default md (24px)
}
```

- Background: `surface`
- Border: 1px `color-border`
- Radius: `radius-lg`
- Shadow: `shadow-sm`
- Hover (cuando es interactiva): `shadow-md`, `motion-base`.

### 4.5 Badge / Pill

Para estados (presente/ausente, al día/moroso, etc.).

| Variant | Bg | Text | Ejemplo |
|---|---|---|---|
| `success` | `success-50` | `emerald-700` | "● Al día" |
| `warning` | `warning-50` | `amber-700` | "● Mora 12d" |
| `danger` | `danger-50` | `red-700` | "● Suspendido" |
| `info` | `brand-50` | `brand-800` | "● B1" |
| `neutral` | `slate-100` | `slate-700` | "● Inactivo" |

- Height: 24px, padding-x: 8px, radius `radius-full`, font `font-label`.
- Dot de 6px a la izquierda con el color sólido del variant.

### 4.6 Modal / Dialog

- Backdrop: `bg-slate-900/60`, `z-overlay`, fade in 200ms.
- Container: `surface`, `radius-xl`, `shadow-lg`, max-width 560px (sm), 720px (md), 960px (lg).
- Padding: `space-8` (32px).
- Animación: scale 0.96 → 1, opacity 0 → 1, `motion-slow`.
- Cierre: ESC, click en backdrop, botón × top-right.
- Focus trap obligatorio. Focus inicial al primer input o al primer botón.

### 4.7 Toast / Notification

- Posición: bottom-right en desktop, top-center en mobile.
- Auto-dismiss: 5s (success/info), 8s (warning), permanente hasta cerrar (error).
- Animación de entrada: slide-up 320ms `motion-slow`, opacity 0 → 1.

### 4.8 Sidebar Navigation

Items por rol. El item activo lleva borde izquierdo de 3px en `accent-500` y `bg-brand-800`.

**Admin sidebar:**
- Dashboard
- Alumnos
- Profesores
- Cursos
- Asistencia
- Notas
- Pagos
- Comunicaciones
- Reclamos
- Reportes
- Configuración

**Profesor sidebar:**
- Mis Cursos
- Tomar Asistencia
- Cargar Notas
- Mensajes
- Mi Perfil

**Alumno sidebar (también bottom-nav en mobile):**
- Inicio
- Mis Notas
- Mi Asistencia
- Pagos
- Mensajes

**Tutor sidebar:**
- Inicio
- Mis Hijos/as
- Pagos
- Mensajes

---

## 5. Pantallas Clave — Specs

### 5.1 `/login`

**Objetivo:** Autenticar al usuario y redirigirlo según su rol.

**Layout:** Auth layout (sección 3.3).

**Componentes:**
| Componente | Variante | Notas |
|---|---|---|
| `Card` | padding-lg | Contenedor del form |
| `Input` (email) | type=email, autocomplete=username | Foco automático al cargar |
| `Input` (password) | type=password, autocomplete=current-password | Toggle de visibilidad (ícono ojo) |
| `Checkbox` | — | "Recordarme" |
| `Button` | primary, fullWidth, lg | "Ingresar" |
| `Link` | — | "¿Olvidaste tu contraseña?" |

**Flujo:**
1. User completa email + password.
2. Click "Ingresar" → loading state en botón, inputs disabled.
3. Server Action `loginAction` (next-safe-action) valida con Zod, llama a `supabase.auth.signInWithPassword`.
4. Si OK: redirect a `/admin`, `/profesor`, `/alumno` o `/tutor` según `profile.role`.
5. Si error:
   - `Invalid login credentials` → toast danger "Email o contraseña incorrectos".
   - Network error → toast danger "Sin conexión. Reintentá".
   - Email no verificado → modal con instrucciones.

**Estados:**
- Loading: botón "Ingresando..." con spinner.
- Error: toast bottom-right, los inputs no muestran error inline (no se sabe cuál falló por seguridad).

**Edge cases:**
- Tutor con varios hijos: un único login, en el dashboard se muestra selector.
- Sesión expirada: redirect aquí con `?reason=expired`, banner amarillo "Tu sesión expiró".

**Accesibilidad:**
- `<form>` con `aria-labelledby` apuntando al título.
- Errores con `aria-live="polite"`.
- Toggle de password con `aria-label="Mostrar contraseña"`.

---

### 5.2 `/admin` — Dashboard

**Objetivo:** Visión global del instituto en KPIs en tiempo real (RF-10).

**Layout:** Dashboard layout completo, sidebar admin.

**Estructura (top-down):**

```
┌─────────────────────────────────────────────────────────────────┐
│  Hola, Directora 👋                            [Filtro: 2026]   │  ← Heading + filtro
├─────────────────────────────────────────────────────────────────┤
│  [KPI 1]   [KPI 2]   [KPI 3]   [KPI 4]                          │  ← 4 cards
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌────────────────────────────┐    │
│  │ Asistencia últimos 30d  │  │ Alertas activas (12)        │    │
│  │ [LineChart]             │  │ - Lista de alertas          │    │
│  │                         │  │                              │    │
│  └─────────────────────────┘  └────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌────────────────────────────┐    │
│  │ Pagos del mes           │  │ Próximos vencimientos       │    │
│  │ [Donut: 92% al día]     │  │ - Tabla compacta            │    │
│  └─────────────────────────┘  └────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

**KPI cards (4 fijas):**

| KPI | Valor | Trend | Color | Fuente |
|---|---|---|---|---|
| Alumnos activos | "187" | "+5 este mes" | success | `students.status='active'` |
| Asistencia promedio | "87%" | "+2pp vs mes ant." | success | `attendance` |
| Morosidad | "8.2%" | "-0.8pp" | warning | `payments.status='overdue'` |
| Notas pendientes | "12" | "Vencen en 2d" | danger | `grades` |

Cada KPI usa `Card` interactiva (click → drill-down a la página del dominio). El número en `font-display-xl`, label en `font-label`, trend con flecha y color semántico.

**Charts:**
- LineChart (asistencia): 30 puntos, eje X últimos 30 días, eje Y 0-100%. Línea brand-700, área debajo brand-50.
- DonutChart (pagos): 3 segmentos (al día, mora <30d, suspendido). Tamaño 200x200.

**Edge cases:**
- Sin datos: card muestra "—" y subtitle "Aún no hay datos suficientes".
- Carga lenta: skeletons rectangulares por card.

---

### 5.3 `/admin/students` — Listado de alumnos

**Objetivo:** CRUD de alumnos, búsqueda y filtros (RF-01, RF-13).

**Layout:** Tabla full-width.

**Toolbar:**
| Elemento | Posición | Comportamiento |
|---|---|---|
| Search input | left, w: 320px | Busca en nombre, DNI, email. Debounce 300ms |
| Filter: Curso | next | Multi-select dropdown |
| Filter: Estado | next | Pills (Activo / Inactivo / Suspendido) |
| Filter: Nivel | next | Pills (A1, A2, B1, B2, C1, C2) |
| Export CSV | right | Ghost button con ícono |
| "Nuevo alumno" | right | Primary button |

**Columnas de la tabla:**

| # | Columna | Tipo | Ancho | Ordenable |
|---|---|---|---|---|
| 1 | ☐ checkbox | select | 40px | no |
| 2 | Nombre completo | text + avatar | flex | sí (default ASC) |
| 3 | DNI | mono | 120px | sí |
| 4 | Curso actual | text | 160px | sí |
| 5 | Nivel | badge info | 60px | sí |
| 6 | Asistencia | progress + % | 120px | sí |
| 7 | Estado pago | badge | 100px | no |
| 8 | Estado | badge | 90px | sí |
| 9 | Acciones | kebab | 48px | no |

**Acciones del kebab:**
- Ver perfil (→ `/admin/students/[id]`)
- Editar
- Inscribir en curso
- Registrar pago
- Suspender (confirm modal con motivo)
- Dar de baja (confirm modal)

**Bulk actions (cuando hay selección):**
Aparece toolbar flotante en el footer:
- "3 alumnos seleccionados"
- Cambiar curso · Enviar mensaje · Marcar como activo · Exportar

**Edge cases:**
- Sin resultados de búsqueda: empty state con "No encontramos alumnos que coincidan con '[query]'" + CTA limpiar filtros.
- Más de 1000 alumnos: paginación servidor obligatoria, search server-side.

---

### 5.4 `/admin/students/new` y `/admin/students/[id]/edit` — Form de alumno

**Objetivo:** Crear o editar alumno (RF-01).

**Layout:** Form en card de max-w-2xl, breadcrumb arriba.

**Secciones (con divisores):**

**1. Datos personales**
- Nombre completo * (text, max 80)
- DNI * (mono, máscara, único en sistema)
- Fecha de nacimiento * (date picker)
- Género (select: Femenino / Masculino / No binario / Prefiero no decir)
- Email (validar único, opcional si menor)
- Teléfono (formato AR)
- Dirección (text, max 200)

**2. Tutor (obligatorio si menor de 18)**
- Tipo de relación (select: Padre/Madre/Tutor legal/Otro)
- Buscador de tutor existente (autocomplete por DNI o nombre) — opción "Crear nuevo tutor" abre modal.

**3. Datos académicos**
- Nivel inicial * (select A1-C2 — autocompletado tras test de nivelación)
- Curso a inscribir * (select, muestra solo cursos con cupo disponible)
- Fecha de inicio (default = hoy)

**4. Pagos iniciales**
- Matrícula (monto autocompletado, editable solo por admin)
- Primera cuota (toggle "Cobrar ahora")

**Footer (sticky en mobile):**
- "Cancelar" (ghost) — vuelve al listado, confirma si hay cambios sin guardar.
- "Guardar como borrador" (secondary) — solo en alta.
- "Guardar e inscribir" (primary).

**Validaciones (Zod schema):**
```ts
const studentSchema = z.object({
  fullName: z.string().min(2).max(80),
  dni: z.string().regex(/^\d{7,8}$/),
  birthDate: z.coerce.date().refine(d => d < new Date(), 'Fecha inválida'),
  email: z.string().email().optional().or(z.literal('')),
  // ...
}).refine(data => {
  const age = calculateAge(data.birthDate)
  return age >= 18 || !!data.tutorId
}, { message: 'Los menores de 18 requieren tutor', path: ['tutorId'] })
```

**Estados:**
- Submitting: botón loading, todos los campos disabled.
- Validación error: scroll al primer campo con error, badge rojo en el tab de la sección si hay error.
- Submit success: toast "Alumno inscripto correctamente", redirect a `/admin/students/[id]`.
- Conflicto (DNI ya existe): error inline en el campo DNI con link "Ver alumno existente".

---

### 5.5 `/profesor/attendance` — Tomar asistencia

**Objetivo:** Registro digital rápido de asistencia (RF-04). KPI: cobertura ≥ 95%.

**Decisión clave:** Diseño optimizado para teclado y para tablet en aula. Una sola pantalla, sin scroll horizontal.

**Layout:**

```
┌──────────────────────────────────────────────────────────────┐
│  ← B1 Mañana — Lun 4 May 2026, 09:00     [Guardar borrador]  │
├──────────────────────────────────────────────────────────────┤
│  Marcar a todos:  [✓ Presentes]  [✗ Ausentes]                │
├──────────────────────────────────────────────────────────────┤
│  ☐ Pérez Juan         [P] [A] [T]    Comentario...           │
│  ☐ García María       [P] [A] [T]    Comentario...           │
│  ☐ Rodríguez Ana      [P] [A] [T]    Comentario...           │
│  ...                                                          │
├──────────────────────────────────────────────────────────────┤
│  Total: 15 alumnos · 12 presentes · 2 ausentes · 1 tarde     │
│                                       [Confirmar asistencia] │
└──────────────────────────────────────────────────────────────┘
```

**Specs:**
- Cada fila tiene 3 botones grandes (touch target 44x44px mínimo) P/A/T.
- Estado activo: el botón seleccionado se llena con color (success/danger/warning).
- Atajos de teclado:
  - `↓` / `↑`: navegar filas.
  - `1`: Presente · `2`: Ausente · `3`: Tarde — y avanza a la siguiente fila.
  - `c`: abre input de comentario en la fila actual.
  - `Cmd/Ctrl+S`: guardar borrador.
  - `Cmd/Ctrl+Enter`: confirmar asistencia.

**Auto-save:**
- Cada cambio dispara debounce 1.5s → guarda borrador.
- Si pierde conexión, indicador en header "Sin conexión — los cambios se guardarán al reconectar". El estado se persiste en `localStorage` con key `attendance:[courseId]:[date]`.

**Confirmar asistencia:**
- Si hay alumnos sin marcar → modal warning "Hay 3 alumnos sin marcar. ¿Marcarlos como ausentes?".
- Tras confirmar:
  1. Persiste en `attendance` table.
  2. Para cada alumno con 2 ausencias consecutivas → genera notificación a tutor (proceso 5).
  3. Calcula nuevo % de asistencia.
  4. Bloquea edición (solo admin puede modificar después).
  5. Toast "Asistencia confirmada para 15 alumnos".

**Edge cases:**
- Clase ya confirmada: vista read-only, banner "Asistencia confirmada el 4/5 09:45 por Prof. Gómez. Editar requiere permiso de admin."
- Alumno suspendido: aparece tachado, no se puede marcar.
- Feriado / clase cancelada: botón "Marcar clase como cancelada" (no penaliza asistencia).

---

### 5.6 `/profesor/grades` — Cargar notas

**Objetivo:** Carga de notas con cálculo automático de promedios (RF-05).

**Layout:** Tabla editable in-line.

```
┌──────────────────────────────────────────────────────────────┐
│  B1 Mañana — Notas                                           │
│  [Tipo: Parcial 1 ▾]  [Fecha: 4/5/2026]    [+ Nueva eval]   │
├──────────────────────────────────────────────────────────────┤
│  Alumno              Nota     Observaciones    Promedio       │
├──────────────────────────────────────────────────────────────┤
│  Pérez Juan          [ 8.5 ]  ____________     8.2 ↑          │
│  García María        [ 9.0 ]  Excelente trab.  9.1 →          │
│  Rodríguez Ana       [   ]    ____________     —              │
│  ...                                                          │
└──────────────────────────────────────────────────────────────┘
```

**Specs:**
- Input de nota: number, min 1, max 10, step 0.1, ancho 80px.
- Validación inline: < 1 o > 10 → border rojo y tooltip.
- Promedio se recalcula en vivo conforme escribís (cliente).
- Indicador trend (↑ ↓ →) comparado con el promedio anterior.
- Auto-save por fila (debounce 2s).

**Publicación:**
- Botón "Publicar notas" (primary, sticky bottom).
- Modal de confirmación: "Se enviarán notificaciones a 15 alumnos y sus tutores. ¿Continuar?"
- Cumple KPI: ≤ 72hs desde la fecha de evaluación → badge "En plazo" verde, > 72hs → "Fuera de plazo" rojo en el listado de evaluaciones.

---

### 5.7 `/admin/payments` — Gestión de pagos

**Objetivo:** Registrar pagos, ver morosidad, generar recibos (RF-06, RF-07).

**Vistas tabbed:**
1. **Pendientes** (default) — cuotas con `due_date <= today + 5 días` y sin pagar.
2. **Mora** — `due_date < today` y no pagados, agrupados por días de mora.
3. **Pagados** — históricos.
4. **Suspensiones** — alumnos con mora ≥ 30 días.

**Tabla de Pendientes:**

| Columna | Notas |
|---|---|
| Alumno | con avatar |
| Concepto | "Cuota Mayo 2026" |
| Vencimiento | con `daysUntil` highlight |
| Monto | mono, alineado a la derecha |
| Acciones | "Registrar pago" (primary sm) · ⋮ |

**Modal "Registrar pago":**
- Monto recibido (default = monto cuota, editable)
- Método (radio: Efectivo / Transferencia / Tarjeta / Mercado Pago)
- Fecha de pago (date, default hoy)
- Comprobante (file upload, opcional pero recomendado)
- Generar recibo (toggle, default ON)
- "Confirmar pago" → primary

**Tras confirmar:**
- Se genera `receipt_number` autoincremental (formato `IIC-2026-00123`).
- Se descarga PDF del recibo automáticamente.
- Toast con CTA "Ver recibo".
- Si era el pago que sacaba al alumno de suspensión → alerta a admin "Alumno reactivado".

**Cálculo de mora visual:**
- 0-9 días: badge `info` ("Próximo a vencer").
- 10-15 días: badge `warning` ("Mora 12d").
- 16-30 días: badge `warning` con borde rojo.
- > 30 días: badge `danger` ("Suspensión recomendada").

---

### 5.8 `/alumno` — Inicio (móvil first)

**Objetivo:** Resumen rápido para el alumno (notas, asistencia, próximos pagos, mensajes).

**Layout móvil:**

```
┌────────────────────┐
│ ☰  IICANA      🔔3 │ ← header
├────────────────────┤
│ Hola, Juan 👋      │
│ B1 Mañana — Prof.  │
│ Gómez              │
├────────────────────┤
│ ┌────────────────┐ │
│ │ Asistencia     │ │
│ │ ████████░ 87%  │ │
│ │ Min: 80% ✓     │ │
│ └────────────────┘ │
│ ┌────────────────┐ │
│ │ Promedio       │ │
│ │ 8.2 ↑          │ │
│ └────────────────┘ │
│ ┌────────────────┐ │
│ │ Próximo pago   │ │
│ │ Cuota Mayo     │ │
│ │ Vence en 4 días│ │
│ │ [Pagar ahora]  │ │
│ └────────────────┘ │
├────────────────────┤
│ Próximas clases    │
│ • Lun 4/5 09:00    │
│ • Mié 6/5 09:00    │
├────────────────────┤
│  [🏠] [📊] [💰] [💬]│ ← bottom-nav
└────────────────────┘
```

**Decisiones móviles:**
- Cards a ancho completo, gap 12px.
- Barra de progreso de asistencia con color condicional (≥80% verde, 70-79% amarillo, <70% rojo).
- CTA "Pagar ahora" abre flujo de pago (Mercado Pago en sprint posterior).
- Bottom-nav fijo, 4 items, item activo en `brand-700` (label + ícono).

---

## 6. Responsive Behavior — Reglas generales

| Breakpoint | Cambio |
|---|---|
| `< sm` (mobile) | Sidebar → drawer. Tablas → cards apiladas (cada fila se vuelve un card). Forms en una columna. Bottom-nav para alumno/tutor. |
| `sm` — `md` | Sidebar drawer. Tablas con scroll horizontal y columnas críticas sticky. |
| `md` — `lg` | Sidebar colapsable (icon-only por default, expand on hover). |
| `lg+` | Layout completo. |

**Regla para tablas en mobile:** convertir cada fila en una card vertical:
```
┌──────────────────────┐
│ Pérez Juan           │ ← nombre destacado
│ DNI 30.123.456       │
│ B1 Mañana · ●Activo  │
│ Asistencia 87%       │
│              [Ver →] │
└──────────────────────┘
```

---

## 7. Estados Globales (todas las pantallas)

### Loading
- Página: skeleton del layout (sidebar, header, contenido).
- Datos: skeleton específico (rows, cards).
- Acción puntual: spinner inline en el botón o ícono.

### Empty
- Ilustración SVG simple monocromática (`color-text-subtle`).
- Título corto explicando qué falta.
- Descripción opcional.
- 1 CTA primario.

### Error
- Banner top de la página con `bg-danger-50`, ícono ⚠ y botón "Reintentar".
- Si es 404: página dedicada con ilustración y links a páginas comunes.
- Si es 500: página dedicada con "Algo salió mal. Ya estamos en eso." + botón "Volver al inicio".

### Offline
- Banner sticky bottom: "Sin conexión. Los cambios se guardarán al reconectar."
- Disable de operaciones que requieren red (excepto las que tienen optimistic UI con cola).

---

## 8. Animation / Motion — Tabla resumen

| Elemento | Trigger | Animación | Duración | Easing |
|---|---|---|---|---|
| Sidebar drawer | open/close en mobile | translate-x | 320ms | motion-slow |
| Modal | open | scale 0.96→1 + opacity 0→1 | 320ms | motion-slow |
| Modal | close | scale 1→0.96 + opacity 1→0 | 200ms | motion-base |
| Toast | enter | translate-y + opacity | 320ms | motion-slow |
| Toast | leave | opacity | 200ms | motion-fast |
| Tooltip | hover (delay 500ms) | opacity 0→1 | 120ms | motion-fast |
| Dropdown | open | translate-y(-4)→0 + opacity | 120ms | motion-fast |
| Button hover | hover | bg color | 120ms | motion-fast |
| Skeleton shimmer | loop | linear-gradient sweep | 1500ms | linear |
| Page transition | route change | opacity 0→1 | 200ms | motion-base |
| Row hover | hover | bg color | 120ms | motion-fast |

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

---

## 9. Accesibilidad — Reglas globales

### Foco
- Todo elemento interactivo tiene `:focus-visible` visible: ring 2px `brand-500`, offset 2px.
- Orden de tab lógico (top-to-bottom, left-to-right).
- Skip-link "Saltar al contenido" como primer focusable.

### ARIA
- Sidebar: `<nav aria-label="Navegación principal">`.
- Tablas: `<table role="table">`, headers con `scope="col"`.
- Modales: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` al título.
- Toasts: contenedor con `role="status"` (info/success) o `role="alert"` (error).
- Iconos solos en botones: `aria-label` obligatorio.
- Inputs: cada uno con `<label for>` o `aria-labelledby`. Errores con `aria-describedby` y `aria-invalid="true"`.

### Teclado
- ESC cierra modales, drawers, dropdowns.
- Enter envía forms (o activa CTA primario en cards).
- Space toggle checkboxes y switches.
- Arrow keys navegan: tabs, radio groups, table cells (en attendance).
- Atajos documentados en footer del sidebar (link "Atajos de teclado").

### Contraste y tamaño
- Texto normal ≥ 4.5:1, texto grande (≥18px o ≥14px bold) ≥ 3:1.
- Touch targets ≥ 44x44px en mobile.
- No transmitir información solo por color (siempre acompañar con icono o texto).

### Screen readers
- Tablas: usar `<caption>` o `aria-label` con descripción.
- Cambios dinámicos críticos (toast, validaciones): `aria-live="polite"`. Errores: `aria-live="assertive"`.
- Imágenes decorativas: `alt=""`. Logo: `alt="IICANA Pueyrredón"`.

### Testing recomendado
- axe-core en CI (eslint-plugin-jsx-a11y mínimo).
- Test manual con NVDA + Chrome y VoiceOver + Safari antes de cada release.

---

## 10. Internacionalización & contenido

- Idioma único: español (es-AR).
- Fechas: `dd/mm/aaaa` (formatear con `Intl.DateTimeFormat('es-AR')`).
- Moneda: ARS, símbolo `$`, separador miles `.`, decimal `,` (`Intl.NumberFormat('es-AR')`).
- Números (notas, %): decimal con coma (`8,5`).

### Microcopy — patrones

| Caso | Tono |
|---|---|
| Confirmación destructiva | "¿Estás seguro? Esta acción no se puede deshacer." |
| Vacío con CTA | "Aún no hay [X]. Empezá creando el primero." |
| Error genérico | "Algo salió mal. Probá de nuevo." |
| Éxito | "Listo. [X] [acción] correctamente." |
| Loading | "Cargando..." nunca "Espere por favor". |

---

## 11. Convenciones de implementación

### Archivos
```
src/
  components/ui/          ← Button, Input, Card, Table, Modal, ...
  components/shared/      ← Header, Sidebar, EmptyState, ...
  lib/design-tokens.ts    ← exports de colores, spacing, motion
  lib/cn.ts               ← clsx + twMerge
  app/globals.css         ← reset, fuentes, prefers-reduced-motion
```

### Naming
- Componentes UI: `PascalCase` con prefijo solo cuando hay riesgo de colisión (`UiButton` no, solo `Button`).
- Variantes con `cva`: `buttonVariants`, exportadas para reuso.
- Props con sufijo de tipo: `onSubmit`, `isLoading`, `hasError`.

### Estado
- Forms: `react-hook-form` + `zodResolver`. Nunca controlar inputs manualmente con `useState`.
- Server data: `fetch` en server components. No usar React Query salvo en flujos altamente interactivos (tabla de asistencia con auto-save).
- Toasts: `sonner` (recomendado, accesible, ligero).

### Dark mode
- **No incluido en MVP.** El instituto opera en horario diurno y los profesores prefieren contraste alto. Dejar la arquitectura preparada (CSS variables) pero sin tema oscuro implementado en sprint 1-3.

---

## 12. Checklist de implementación por sprint

**Sprint 1 — Fundaciones (2 semanas):**
- [ ] Configurar Tailwind con design tokens.
- [ ] Componentes base: Button, Input, Card, Badge, Modal, Toast.
- [ ] Auth layout + pantalla de login funcional.
- [ ] Dashboard layout (sidebar + header) responsive.
- [ ] Páginas placeholder por rol.

**Sprint 2 — Núcleo académico:**
- [ ] Módulo `students` completo (list, create, edit, view).
- [ ] Módulo `courses` completo.
- [ ] Componente Table reutilizable con tanstack/react-table.

**Sprint 3 — Operación diaria:**
- [ ] Pantalla `tomar asistencia` (con atajos + auto-save).
- [ ] Pantalla `cargar notas` (con cálculos en vivo).
- [ ] Notificaciones push básicas.

**Sprint 4 — Pagos y reportes:**
- [ ] Módulo `payments` con generación de recibos PDF.
- [ ] KPIs del dashboard de admin con datos reales.
- [ ] Exportación CSV/Excel.

---

## 13. Open questions (para resolver con la directora antes de Sprint 2)

1. **Logo y branding oficial:** ¿IICANA tiene manual de marca? Confirmar paleta institucional definitiva.
2. **Recibos:** ¿formato AFIP electrónico requerido o basta con PDF interno? Impacta integración.
3. **Mercado Pago:** ¿cobros online en MVP o solo registro manual?
4. **Comunicación con tutores:** ¿solo in-app o también email/WhatsApp? (RF-08, RF-09).
5. **Test de nivelación:** ¿se carga manualmente o el sistema debe rendirlo online?
6. **Backup:** ¿Supabase backups son suficientes o requieren export semanal a Drive?

---

**Fin del documento.** Cualquier elemento no especificado acá → preguntar antes de implementar. Las decisiones de diseño documentadas acá son las únicas válidas; cambios deben actualizarse en este archivo y notificarse al equipo.
