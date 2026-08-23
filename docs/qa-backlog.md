# QA Backlog — campaña de testing E2E + auditoría

> **Todos estos hallazgos ya están cargados en Jira: SCRUM-234 a SCRUM-259** (proyecto SCRUM, label `qa-e2e`).
> Este archivo queda como índice/detalle técnico. Fuentes: suite E2E (Playwright) + auditoría paralela de 8 subagentes sobre todos los módulos.
>
> **Resumen:** 26 tickets — 5 de severidad alta (edición no persiste SCRUM-242, placementTestScore SCRUM-243, alta de curso bloqueada SCRUM-236, reactivar inscripción SCRUM-244, reportes admin 403 SCRUM-245), ~15 media (seguridad/lógica) y ~6 baja.

Formato por ticket: **Tipo · Prioridad · Descripción · Pasos · Resultado esperado vs actual · Criterio de aceptación**.

> Estado de la suite al momento: Fase 0 (fundaciones) + Fase 1 (smoke) + Fase 2 en curso (módulos core: Alumnos y Docentes validados). Los bugs BUG-A y BUG-C están cubiertos por tests `test.fail()` que avisarán cuando se arreglen.

---

## BUG-A · Eliminar un alumno desde el detalle deja al usuario en un 404

- **Tipo:** Bug
- **Prioridad:** Media (funcional/UX — la operación se completa, pero la navegación posterior es incorrecta)
- **Componente:** Alumnos (director/administrativo) · `deleteStudentAction` + `FormButton`

**Descripción:** Al eliminar un alumno desde su página de detalle (`/director/students/[id]`), el registro se borra correctamente, pero en vez de redirigir a la lista, el usuario queda en la URL del detalle mostrando la pantalla **404 "Página no encontrada"** (porque el detalle se revalida, `getStudentById` devuelve null y dispara `notFound()`, pisando el `router.push` del cliente).

**Pasos para reproducir:**
1. Entrar como director a `/director/students`.
2. Abrir el detalle de un alumno.
3. Click en **Eliminar** → **Confirmar**.

**Esperado:** redirigir a `/director/students` (la lista) con toast "Alumno eliminado".
**Actual:** queda en `/director/students/[id]` mostrando un 404.

**Causa probable:** la action retorna `redirectTo` para que el cliente haga `router.push`, pero el `revalidatePath` re-renderiza el detalle (ahora inexistente) → `notFound()`. 
**Fix sugerido:** usar `redirect("/director/students")` server-side dentro de la action (Next corta el render con el redirect) en lugar de devolver `redirectTo` para push del cliente. Revisar el mismo patrón en otras entidades con borrado desde detalle (docentes, cursos, etc.).

**Criterio de aceptación:** tras eliminar desde el detalle, el usuario aterriza en el listado y ve el toast de éxito; el alumno ya no aparece. El test `BUG-A` de `tests/e2e/director/students.spec.ts` deja de fallar (quitar `test.fail`).

---

## BUG-C · El alta de alumno se bloquea en silencio si no se asigna "Nivel"

- **Tipo:** Bug
- **Prioridad:** Media-Alta (funcional/UX — bloquea un alta válida sin ningún feedback)
- **Componente:** `StudentForm` (`src/modules/students/components/StudentForm.tsx`) + `createStudentSchema`

**Descripción:** El campo **"Nivel asignado"** es **opcional** y su valor por defecto es "Sin asignar" (`value=""`). Al enviar el formulario sin elegir nivel, la validación **client-side** de `zodResolver` rechaza `level: ""` (no es un valor del enum y `.optional()` no acepta la cadena vacía). Como el `Field` de "Nivel asignado" **no renderiza el mensaje de error**, el `react-hook-form` bloquea el submit **sin ningún feedback visible**: el usuario clickea "Registrar alumno" y no pasa nada, el Server Action nunca se llama.

**Pasos para reproducir:**
1. `/director/students/new`.
2. Completar todos los campos válidos **dejando "Nivel asignado" en "Sin asignar"**.
3. Click en **Registrar alumno**.

**Esperado:** como el nivel es opcional, el alumno se crea y redirige a la lista.
**Actual:** no pasa nada — sin navegación, sin toast, sin error inline.

**Causa:** desajuste client/server. El server (`actions.ts`) hace `level: (...) || undefined` (maneja bien el ""), pero el schema client (`z.enum([...]).optional()`) no. 
**Fix sugerido:** en `createStudentSchema`, preprocesar el `level` para convertir `""`→`undefined` (p. ej. `z.preprocess(v => v === "" ? undefined : v, z.enum([...]).optional())`), y/o mostrar el error de ese `Field`. Revisar **otros selects opcionales de enum** que rendericen `value=""` por defecto (posible patrón repetido).

**Nota importante:** el feedback por **toast SÍ funciona** — con un nivel asignado, un DNI duplicado muestra el toast "Ya existe un alumno registrado con ese DNI" en ~1.4s. (Descartado un hallazgo previo — "los errores de servidor no muestran toast" — que resultó ser este bloqueo silencioso por el nivel vacío.)

**Criterio de aceptación:** crear un alumno sin nivel funciona (o muestra un error claro). El test `BUG-C` de `tests/e2e/director/students.spec.ts` deja de fallar (quitar `test.fail`).

---

## BUG-D · No se puede crear un curso desde el formulario (validación bloquea el submit)

- **Tipo:** Bug
- **Prioridad:** **Alta / Crítica** (rompe un flujo core: alta de cursos)
- **Componente:** `CourseForm` + `SchedulePicker` (`src/modules/courses/components/`) + `createCourseSchema`

**Descripción:** El `SchedulePicker` maneja `classDays`, `classTime` y `classDurationMinutes` como **inputs `hidden` fuera de react-hook-form** (no los registra). El `zodResolver` client-side valida los valores de RHF, donde esos campos son `undefined`, así que al enviar aparece el error **"Invalid input: expected array, received undefined"** (en el campo Horario) y **el submit se bloquea: el curso nunca se crea**. El usuario completa todo bien (día, hora, duración, preview correcto) y no puede crear el curso.

**Pasos para reproducir:**
1. `/director/courses/new`.
2. Completar nombre, nivel, seleccionar un día, hora y cupo.
3. Click en **Crear curso**.

**Esperado:** el curso se crea y redirige a `/director/courses`.
**Actual:** error "Invalid input: expected array, received undefined" en Horario; no se crea nada.

**Notas:**
- El **Server Action sí funciona** — parsea `classDays` desde el string separado por comas (`actions.ts` línea 19). El problema es puramente la validación **client-side**.
- La **edición** de cursos NO tiene el bug: su schema es `.partial()`, así que `classDays` undefined pasa. Solo afecta al **alta**.
- **Fix sugerido:** registrar los valores del `SchedulePicker` en react-hook-form (via `Controller`/`setValue`) para que el `zodResolver` los vea, o excluir esos campos de la validación client-side y validarlos solo en el server.

**Criterio de aceptación:** crear un curso con día/hora/cupo válidos funciona y redirige a la lista. El test `BUG-D` de `tests/e2e/director/courses.spec.ts` deja de fallar (quitar `test.fail`).

---

## TOOL-1 · La suite E2E crasheaba por incompatibilidad Playwright 1.61 + Node 22.15

- **Tipo:** Tarea técnica / Deuda
- **Prioridad:** Alta (bloqueaba toda la suite E2E)
- **Componente:** Tooling / CI

**Descripción:** Playwright 1.61 usa `module.registerHooks` (Node ≥22.15), donde `context.conditions` es un `Set`, pero Playwright invoca `.includes()` (método de Array) → `TypeError: context.conditions?.includes is not a function` en **cualquier import `.ts` local** desde specs/config. Rompe la carga de la suite.

**Workaround aplicado (temporal):** parche directo en los archivos instalados de `node_modules/.pnpm/playwright@1.61.0` (soporta `Set` y `Array`). Hay un `patches/playwright@1.61.0.patch` generado, pero `pnpm patch-commit` falló por desajuste de versión (lockfile resuelve `1.61.1`, en disco hay `1.61.0`) + registry lento.

**Fix durable (elegir uno):**
- Actualizar Playwright a una versión que ya maneje el `Set` (preferido), **o**
- Fijar `@playwright/test` a `1.61.0` exacto y aplicar el `patches/playwright@1.61.0.patch` vía `patchedDependencies` (`pnpm install` con red estable).

**Criterio de aceptación:** `pnpm test:e2e` corre en limpio tras un `pnpm install` fresco, sin parches manuales en `node_modules`.

---

## OPS-1 · El proyecto Supabase de dev se auto-pausa y tumba dev + tests

- **Tipo:** Tarea / Infra
- **Prioridad:** Baja
- **Componente:** Infra / Supabase

**Descripción:** El proyecto Supabase (free tier) se pausa por inactividad; al pausarse, REST y el pooler Postgres dejan de responder (`tenant/user not found`), rompiendo `pnpm dev`, el seed y la suite sin un mensaje claro.

**Fix sugerido:** proyecto de test dedicado en un plan que no pause, o un healthcheck/reactivación previa a la corrida de tests. Documentar el síntoma.

**Criterio de aceptación:** la suite no falla por proyecto pausado (o el error es explícito y auto-recuperable).

---

## BUG-E · Warning de React: `Field` inyecta `error` en elementos DOM crudos

- **Tipo:** Bug (cosmético / deuda)
- **Prioridad:** Baja (ruido en consola, sin impacto funcional)
- **Componente:** `Field` en `src/components/ui/Input.tsx`

**Descripción:** `Field` hace `cloneElement(child, { error: !!error })` sobre **todos** sus hijos. Cuando un hijo es un elemento DOM crudo (p. ej. el `<input type="hidden">` y el `<div>` de botones en los campos de **cupo** (curso), **nota** (grade) y el **SchedulePicker**), React recibe `error={false}` en un elemento nativo y emite: *"Received `false` for a non-boolean attribute `error`"*. Aparece repetidamente en la consola del server/navegador.

**Fix sugerido:** en `Field`, inyectar `error` solo en los hijos que lo aceptan (Input/Select/Textarea) — p. ej. chequear el tipo del componente antes de clonar, o envolver los botones en un componente que consuma `error`.

**Criterio de aceptación:** no aparecen más warnings de "non-boolean attribute error" al abrir los formularios de curso/nota.

---

## OBS-1 · (Observación, no bug) Warning de Supabase getSession()

- **Tipo:** Observación / Won't fix
- **Componente:** `src/lib/auth/helpers.ts`

El dev server loguea repetidamente *"Using getSession() could be insecure… use getUser()"*. Es **intencional** por diseño (el `proxy.ts` valida con `getUser()` en cada request; `getServerUser` usa `getSession()` a propósito para evitar una llamada de red por página). No es un bug; documentado para evitar re-investigarlo.

---

## Cosas verificadas que están BIEN (no generan ticket)

- **Aislamiento de portal por rol:** los 4 layouts (`*/layout.tsx`) hacen `redirect(\`/${role}\`)` server-side. Ningún rol ve datos de otro portal. ✔
- **`administrativo` → 403** en rutas exclusivas de dirección (`proxy.ts`). ✔
- **Carga de páginas índice** de los 4 roles sin error. ✔
- **`Promise.all` con queries Drizzle (max:1) NO se cuelga** — la página de detalle de alumno (3 queries concurrentes) carga rápido. ⚠️ La memoria interna `feedback_drizzle_no_promise_all` parece **desactualizada**; conviene revisarla/quitarla.
- **CRUD de Alumnos y Docentes** (crear, editar, eliminar) funciona de punta a punta. ✔
- **Validaciones client-side** (requeridos, formato DNI) muestran error inline. ✔
- **Feedback por toast** (Sonner) funciona: un error de servidor (DNI duplicado) muestra su toast en ~1.4s. ✔
- **Rechazo de DNI duplicado** (alumnos y docentes) con mensaje correcto. ✔

## Nota de infraestructura de tests

- Las listas se cachean con `unstable_cache` (tags `students`, `teachers`, …) y solo se
  invalidan con mutaciones de la app. Un **reseed directo en la DB** no las invalida →
  un server de dev reusado puede servir ids viejos y el detalle da 404. Por eso la suite
  usa `reuseExistingServer: false` (server fresco por corrida) y los tests de detalle se
  ejercitan sobre entidades creadas por la UI (cache consistente), no sobre las sembradas.
