# PO — Inventario de Jira, desfasajes Jira↔código y revisión de producto

Campaña QA y pulido, octubre 2026 · Fecha: 13/10/2026 · Rama `main` @ `5207074`
Autor: Product Owner · Prefijo de hallazgos: `PO-NNN`

> **Fase 1, solo lectura.** No se creó, editó, transicionó ni comentó nada en Jira, y no se tocó código. Las acciones sobre tickets que aparecen abajo son **propuestas** para ejecutar en la fase 2, después de revisarlas.
>
> **Aviso que condiciona todo el backlog:** según DEV-005, `localhost:3000` usa la **base de producción**. Los usuarios `@e2e.test` existen en producción, con la contraseña versionada en el repo. El recorrido de producto de este documento fue de solo lectura (navegación GET, sin enviar formularios).

---

## 1. Estado de Jira

### 1.1 Proyecto y tablero

| Dato | Valor |
|---|---|
| Proyecto | `SCRUM` (iicana.atlassian.net) |
| Tablero | "SCRUM board", id 1, tipo `simple` (proyecto *team-managed*) |
| Componentes | **Ninguno** definido. El proyecto team-managed no los usa como en un proyecto company-managed |
| Campo prioridad | **Todos los issues abiertos están en `Medium`.** La severidad se lleva en labels (`severidad-alta`, `severidad-media`…) y en el prefijo del título (`[Alta]`, `[Media]`) |
| Story points (`customfield_10016`) | Cargados en los sprints 1–8 (ver `docs/metricas-sprints.md`). **Vacíos en los 10 issues del Sprint 9** |

### 1.2 Sprints

| Sprint | Fechas | Estado |
|---|---|---|
| 0 a 8 | 19/01 → 25/06/2026 | Cerrados (480 SP entregados según `metricas-sprints.md`) |
| **Sprint 9** | 28/08 → **11/09/2026** | **Activo y vencido hace 32 días** |

**Sprint 9.** Objetivo: *"Eliminar las pérdidas silenciosas de datos y hacer cumplir las reglas de negocio en el servidor"*. Tiene 10 issues: SCRUM-235, 236, 242, 243, 244, 246, 247, 248, 249 y 252. Los 10 están en **Por hacer** y ninguno tiene story points.

- No hay ningún commit de código desde el 23/08 (`4b71c22`). Los únicos commits posteriores son de Dependabot. El sprint no tuvo avance.
- La Épica 1 del plan (`docs/sprint-9-plan.md`) suma 9 SP y la Épica 2, 14 SP. El stretch (SCRUM-245, 255, 251) no se agregó al sprint.
- Las "épicas" del plan del sprint no existen en Jira. Son agrupaciones del documento, y los bugs SCRUM-234..260 no tienen épica padre.

### 1.3 Épicas abiertas

| Épica | Título | Hijos | Estado real | Acción propuesta |
|---|---|---|---|---|
| SCRUM-128 | Módulo Documentos | 129, 130, 131: todos Finalizado | Hecho (`d9480f0`) | **Cerrar** |
| SCRUM-150 | CI/CD con GitHub Actions | 151–158 abiertos, 166 Finalizado | Casi todo hecho (ver §2.1) | Cerrar las tareas hechas y después la épica |
| SCRUM-167 | Corrección de Bugs: RLS, validaciones y calidad de datos | 133, 160–165, 168, 169: todos Finalizado | Hecho | **Cerrar** |
| SCRUM-170 | Rol Administrativo | 137, 171–177, 196–201: todos Finalizado | Hecho | **Cerrar** |
| SCRUM-178 | Rediseño del sistema de pagos | 179–185: todos Por hacer | Nada implementado. Bloqueado por preguntas al cliente (I-02, I-03) | Mantener. Fuera de la campaña de pulido salvo BA-004 y BA-018 |
| SCRUM-191 | Ajustes de negocio (relevamiento con la Directora) | 186–190, 233: Por hacer | 186 hecho en código; 188 y 190 son P1 para la defensa | Mantener. Cerrar 186 |
| SCRUM-194 | UX y responsive mobile | 139: Por hacer | Vigente | Mantener. Aloja los PO de UX |
| SCRUM-195 | Corrección de Bugs | 192, 193, 226–230: todos Finalizado | Hecho | **Cerrar** (no reusarla: el nombre es genérico) |
| SCRUM-206 | Automatizaciones del sistema | 207–214: todos Finalizado | **Parcial:** la mora no es automática (DEV-025, BA-007) | Mantener abierta hasta resolver DEV-025/026/031 |
| SCRUM-215 | Alertas por email | 216–222: todos Finalizado | Parcial: DEV-026, DEV-027, DEV-028 | Mantener abierta hasta resolver esos tres |

### 1.4 Issues abiertos (no épicas), 50 en total

**Bugs de la campaña anterior (label `qa-e2e`, SCRUM-234..260), 27 issues.** Todos en *Por hacer*, prioridad `Medium` y sin épica.

| Ticket | Título corto | Labels de severidad | Sprint 9 | Verificado en código hoy |
|---|---|---|:-:|---|
| SCRUM-234 | Borrar desde el detalle → 404 | media | | Vigente (sin `redirect()` server-side) |
| SCRUM-235 | Alta de alumno bloqueada si no se elige nivel | media-alta | ✔ | Vigente (`students/schemas.ts:12`, sin preprocess) |
| SCRUM-236 | No se puede crear un curso | **alta** | ✔ | Vigente (`SchedulePicker` fuera de RHF; DEV §2) |
| SCRUM-237 | Warning `error` en elementos DOM | baja | | Vigente (DEV-043) |
| SCRUM-238 | Fix durable Playwright 1.61 + Node 22.15 | tooling | | **Resuelto** (ver §2.1) |
| SCRUM-239 | Supabase de dev se auto-pausa | infra | | Absorbido por DEV-005 (proyecto separado) |
| SCRUM-240 | Validaciones de fecha faltantes | media | | Vigente (DEV-037 cubre asistencia) |
| SCRUM-241 | Comunicaciones: opción `role:admin` | media | | Vigente (`NotificationForm.tsx:75`) |
| SCRUM-242 | Editar nombre/teléfono no persiste | **alta** | ✔ | Vigente (DEV-017) |
| SCRUM-243 | `placementTestScore` nunca se guarda | **alta** | ✔ | Vigente (DEV-018) |
| SCRUM-244 | Reactivar inscripción saltea cupo | **alta** | ✔ | Vigente (DEV-020, BA-006) |
| SCRUM-245 | Reportes Excel: 403 para administrativo | **alta** | | Vigente (3 rutas con `role !== "director"`; DEV-024) |
| SCRUM-246 | IDOR: profesor carga notas ajenas | media + seguridad | ✔ | Vigente (DEV-010, BA-010) |
| SCRUM-247 | Director se auto-desactiva | media | ✔ | Vigente (DEV-023, BA-027) |
| SCRUM-248 | Promoción sin revalidar elegibilidad | media | ✔ | Vigente (`promoteEnrollment` sin chequeo; DEV-036, BA-003) |
| SCRUM-249 | `markAsPaid` resucita pagos anulados | media | ✔ | Vigente (DEV-030, BA-013) |
| SCRUM-250 | Encuesta "anónima" guarda `enrollmentId` | media + privacidad | | Vigente (BA-025, DEV-012) |
| SCRUM-251 | Autoevaluación sin guard de intento duplicado | media | | Vigente (DEV-013) |
| SCRUM-252 | No se puede desasignar el docente | media | ✔ | Vigente (`courses/schemas.ts:24`) |
| SCRUM-253 | Administrativo cae en `/director` | media | | Vigente (`ComplaintList.tsx:62,112`; DEV-045) |
| SCRUM-254 | Estado de reclamo no revalida el detalle | media | | Vigente |
| SCRUM-255 | Consulta de marketing sin contacto | media | | Vigente. Depende de la decisión sobre SCRUM-187 |
| SCRUM-256 | QuizPlayer ignora el error del envío | media + ux | | Vigente (`QuizPlayer.tsx:60`) |
| SCRUM-257 | Forms de estado sin toast de éxito | baja + ux | | Vigente |
| SCRUM-258 | Validaciones menores cliente/servidor | baja | | Vigente |
| SCRUM-259 | Código muerto (`registerAction`, rol admin, egreso) | baja | | Vigente. **`registerAction` sube a crítico por DEV-002** (registro público abierto) |
| SCRUM-260 | Fechas con un día de menos | baja | | Vigente (63 usos de `new Date(x).toLocaleDateString`; DEV-032 es el mismo problema del lado del cálculo) |

**Backlog previo, 23 issues:**

- SCRUM-139: tablas → cards en mobile.
- SCRUM-151..158: CI.
- SCRUM-159: `[TEMPLATE]` de bug, que no es trabajo.
- SCRUM-179..185: rediseño de pagos.
- SCRUM-186..190: ajustes de negocio.
- SCRUM-233: lista de espera.

### 1.5 Lectura del PO

1. **El tablero no refleja la realidad.** Tiene un sprint vencido sin avance, 6 épicas con todos sus hijos cerrados y 9 tareas de CI ya hechas. Un tribunal que abra Jira ve más trabajo pendiente del que hay y un sprint abandonado.
2. **La prioridad no se usa.** Con todo en `Medium`, no se puede ordenar el backlog por prioridad ni filtrar. La severidad vive en labels con 4 variantes (`severidad-alta`, `severidad-media-alta`, `severidad-media`, `severidad-baja`).
3. **Hay pendientes de la campaña anterior sin épica.** Los 27 bugs `qa-e2e` no cuelgan de ninguna épica, así que no aparecen en el roadmap.
4. **Faltan las 3 vulnerabilidades críticas** (DEV-001, 002, 005). No hay ningún ticket que las cubra. Son lo primero que hay que cargar.

---

## 2. Desfasajes Jira ↔ código

### 2.1 Tickets abiertos que ya están resueltos en código → cerrar

| Ticket | Evidencia | Acción |
|---|---|---|
| SCRUM-238 Playwright 1.61 + Node 22.15 | `@playwright/test` pasó a `^1.62.1` (Dependabot `f3612f2`, #135). `playwright@1.62.1/lib/transform/esmLoader.js:7642,7667` usa `new Set(context.conditions).has(...)`, que acepta Set y Array. No existe `patches/` ni `patchedDependencies` | **Cerrar.** Comentar el commit y pedir confirmación con `pnpm test:e2e` después de un `pnpm install` limpio |
| SCRUM-186 edad mínima de 6 años | `students/schemas.ts:11` `birthDate: birthDateField(6)` (commit `b7fa569`) | **Cerrar** |
| SCRUM-151 workflow base de CI | `.github/workflows/ci.yml` | **Cerrar** |
| SCRUM-152 job de typecheck | `ci.yml:55` `pnpm tsc --noEmit` | **Cerrar** |
| SCRUM-153 job de ESLint | `ci.yml:31` `pnpm lint` | **Cerrar** |
| SCRUM-157 schedule diario E2E | `e2e-daily.yml:11-12` `cron: "0 6 * * *"` | **Cerrar** |
| SCRUM-158 completar specs E2E | `4b71c22`: suite de 162 tests sobre los 4 portales | **Cerrar** |
| SCRUM-154 E2E en CI "contra producción" | `4b71c22` lo cambió a propósito: build local + Supabase de test | **Actualizar** el título y la descripción ("contra un build local y una base de test") y cerrarlo. Ojo: según DEV-005, la "base de test" hoy **es** producción |
| SCRUM-155 usuario dedicado E2E | `scripts/seed-e2e.ts` crea los 4 usuarios `@e2e.test` | **Actualizar, no cerrar:** los usuarios existen pero viven en producción con la contraseña versionada (DEV-005). Pasa a depender del ticket de DEV-005 |
| SCRUM-156 GitHub Secrets | `e2e-daily.yml` requiere `SUPABASE_TEST_*` y `DATABASE_TEST_URL` | **Verificar** en GitHub (no se puede desde acá) y cerrar si están cargados |
| Épicas 128, 167, 170, 195 | Todos sus hijos están Finalizado | **Cerrar** |

### 2.2 Tickets cerrados cuyo problema sigue presente → reabrir o crear un bug vinculado

| Ticket cerrado | Problema vigente | Evidencia | Acción |
|---|---|---|---|
| SCRUM-209 Bloqueo automático por morosidad | El bloqueo no es automático (depende de "Verificar mora") y no se levanta al pagar | DEV-025, DEV-031, BA-008 | **Bug nuevo vinculado** ("is caused by"/"relates"). No reabrir: la historia se entregó y la falla es de diseño |
| SCRUM-207 Alerta automática de morosidad | Ningún proceso pasa los pagos a `overdue`, y la alerta comparte columna con la de Dirección | DEV-025, DEV-026, BA-007 | Bug nuevo vinculado (el mismo que el anterior o uno hermano) |
| SCRUM-210 Alerta al docente bajo 70% de asistencia | Usa 70% mientras la promoción usa 80%: dos umbrales para la misma regla | `promotions.service.ts:5` `ATTENDANCE_THRESHOLD = 80`; BA-019 | Se resuelve con SCRUM-190 + BA-019. Vincular |
| SCRUM-214 Riesgo de abandono | La intervención registrada se pierde en la corrida siguiente | DEV-038 | Bug nuevo vinculado |
| SCRUM-218/219/220 Alertas por email | Los fallos de envío se marcan como enviados; el cron acepta `Bearer undefined` si falta `CRON_SECRET` | DEV-027, DEV-028 | Bugs nuevos dentro de SCRUM-215 |
| SCRUM-93 E2E "crear curso con SchedulePicker" | El alta de curso está rota hoy | SCRUM-236 (`test.fail` en `courses.spec.ts:49`) | Ya cubierto por SCRUM-236. Vincular como regresión |
| SCRUM-131 Evaluaciones IA con documentos | El material es global y público, no por curso | DEV-040 | Se resuelve con SCRUM-189. Vincular |
| SCRUM-232 Asistencia duplicada por fecha | El duplicado se cerró, pero las alertas y la IA se disparan dos veces | DEV-037 | Bug nuevo (es otro defecto) |
| SCRUM-133/193/229 Docente y autoevaluaciones | El profesor publica, archiva y genera IA de cursos ajenos | DEV-015 | Bug nuevo de seguridad (helper de propiedad) |
| SCRUM-123 `DATABASE_URL` de preview en 5432 | Está Finalizado en Jira, pero nadie lo pudo verificar (el conector de Vercel no está autorizado) | DEV-008 | **Verificar** con `vercel env ls`. Reabrir si sigue en 5432 |

### 2.3 Documentación desactualizada respecto de Jira

| Dónde | Dice | Realidad | Acción |
|---|---|---|---|
| `CLAUDE.md` §"Pendiente" | SCRUM-122, 123, 124 pendientes | Los tres están **Finalizado** en Jira. 122 está hecho en código (`Topbar.tsx:37,89-91`, contador `9+`) y 124 también (`director/users/[id]/page.tsx:73-76`). 123 no se puede verificar (ver §2.2) | Actualizar `CLAUDE.md`: sacar 122 y 124 y dejar 123 como "a verificar" |
| `CLAUDE.md` §"Implementado" | "Material/documentos por curso" | La tabla `documents` no tiene `course_id`: el material es global (DEV-040) | Corregir el texto (y SCRUM-189 queda vigente) |
| `CLAUDE.md` reglas de negocio | 80% y 7/10 | La Directora pidió 70% y 0–100 (SCRUM-188/190) | Lo cubre BA-030 |
| `docs/sprint-9-plan.md` | "Backlog previo: SCRUM-122, 123, 124" | Están cerrados | Lo corrige el cierre del Sprint 9 |
| `docs/hallazgos.md` A-02 | "Falta abrir el Sprint 9" | Se abrió y está vencido | Actualizar |
| Memoria `feedback_drizzle_no_promise_all` | Los `Promise.all` cuelgan | `qa-backlog.md` dice que no cuelgan; DEV-042 lo precisa: no ganan nada y hay una carrera en `courses` | Lo cubre DEV-042 |

### 2.4 Trabajo hecho sin ticket en Jira

| Commit | Trabajo | Acción |
|---|---|---|
| `d3a0786` (+ `a809818`, migración 0012) | Corregir y eliminar una toma de lista (D-01) | Crear una historia retroactiva y cerrarla, vinculada al sprint en que se hizo |
| `5af96a5` (migración 0013) | Editar un pago pendiente y anular un pago (D-02) | Ídem |
| `3e1f8b2` | Reportes: análisis descriptivo, diagnóstico y predictivo | Ídem. Es material fuerte para la defensa y hoy no tiene trazabilidad |
| `03196c4` | Panel de automatizaciones para correr los crons a mano | Ídem, dentro de SCRUM-206 |
| `2a6c515`, `f90a2d6`, `a08c6f7`, `8ccb647`, `73cdc06`, `9ece1f5` | Migración de todos los formularios a React Hook Form + Zod, validación inline y selectores visuales | Una historia técnica retroactiva |
| `4b71c22` | Suite E2E de 162 tests, seed determinístico y CI contra build local | Cierra SCRUM-158 (ver §2.1). Agregarle una tarea retroactiva para el seed |
| `b7fa569` | Rango de fecha de nacimiento y puntaje del test | Cierra SCRUM-186 |
| `fab1eda`, `28338f6`, `922909c`… | Documentos de los 7 encuentros | Tareas de documentación del PO/SM, si se quiere medir la carga |

### 2.5 Higiene

- **SCRUM-159 `[TEMPLATE] Bug report`** está abierto como si fuera trabajo. Propuesta: marcarlo con el label `template` (ya lo tiene) y excluirlo de los filtros del board con `labels != template`, o moverlo a un estado propio. No cerrarlo, porque se clona.
- **Sprint 9:** cerrarlo y mover sus 10 issues al Sprint 10 de la campaña. Documentar en la retrospectiva que no hubo avance y por qué (es un impedimento real, y conviene registrarlo antes de que lo encuentre el tribunal).

---


## 3. Revisión de producto por rol

### 3.0 Método y límites

- Recorrido con Playwright (Chromium) sobre `localhost:3000` con los 4 usuarios `@e2e.test`, solo navegación GET y screenshots. No se envió ningún formulario. Script: `scratchpad/po/tour.cjs`.
- **El recorrido quedó incompleto.** Durante la sesión hubo cortes de red y DNS. Además, las páginas que leen con Drizzle (dashboard del director, inscripciones, pagos, notas, reportes, riesgo y todo el portal alumno) quedaron en *skeleton* más de 150 s, mientras que las que leen por el cliente Supabase o desde caché (alumnos, cursos y el panel docente) respondían en 1–4 s. Una conexión nueva a la misma base, abierta desde un script, respondía en 300 ms. Eso apunta a que la **única** conexión de Drizzle del servidor (`max: 1`) quedó colgada después del corte y bloqueó a toda la app (ver PO-014; QA1-016 vio lo mismo).
- Lo que no se pudo ver en pantalla se evaluó leyendo las páginas: `director/page.tsx`, `administrativo/page.tsx`, `profesor/page.tsx`, `alumno/page.tsx`, `Sidebar.tsx` y las páginas de cada portal. Se citan como evidencia.
- **No se repiten** los hallazgos de QA1/QA2, DEV ni BA. Cuando un problema de producto ya está cubierto, se indica la referencia. Los `PO-NNN` son de **valor y experiencia**: qué le falta a cada rol para hacer su trabajo y qué conviene mostrar en la defensa.
- Evidencias: `evidencias/PO-dashboard-director-skeleton.png`, `evidencias/PO-panel-docente.png` y `evidencias/PO-tomar-asistencia-docente.png`.

### 3.1 Diagnóstico general

La app cubre el circuito completo del instituto (alta, inscripción, cursada, cobranza, promoción, cierre) y tiene diferenciales fuertes para una tesis: IA para autoevaluaciones, riesgo de abandono, automatizaciones y reportes con análisis predictivo. El problema de producto no es de alcance. Hay cuatro:

1. **Seguridad y datos de producción** (DEV-001, 002, 003, 005). Ningún pulido de UX importa si la demo se puede romper tomando la cuenta del director con un link. Es el primer bloque de la campaña, sin discusión.
2. **Reglas del cliente desactualizadas** (BA-001, BA-002: 70% y escala 0–100). Es lo primero que va a preguntar el tribunal, y contradice el análisis que se presenta.
3. **Los portales de profesor y alumno son delgados.** Muestran listas, pero no responden la pregunta de cada usuario: *"¿quién de mis alumnos está en problemas?"* y *"¿voy a promocionar?"*. La inteligencia del sistema (riesgo, umbrales, alertas) solo la ve Dirección.
4. **La operación diaria del administrativo tiene fricción alta.** Cargar las cuotas es manual, una por una. Los reportes le dan 403. No tiene una vista de cursos y cupos para inscribir. Varias acciones lo sacan a `/director`.

### 3.2 Director

| ID | Hallazgo | Evidencia | Impacto | Propuesta | Rel. |
|---|---|---|---|---|---|
| **PO-001** | **El menú tiene 23 ítems planos, sin agrupar.** "Comunicaciones" (enviar mensajes) y "Notificaciones" (configurar alertas automáticas) parecen lo mismo. "Cursos" y "Material" usan el mismo ícono (`BookOpen`). "Administrativos" es un filtro de Usuarios disfrazado de sección | `Sidebar.tsx:47-69` | Cuesta encontrar cosas, sobre todo en la demo y en mobile, donde el drawer obliga a hacer scroll | Agrupar en secciones con encabezado: *Académico* (Alumnos, Docentes, Cursos, Inscripciones, Asistencia, Notas, Material, Autoevaluaciones), *Administración* (Pagos, Reclamos, Comunicaciones), *Gestión* (Eval. docentes, Promociones, Cierre de ciclo, Riesgo, Reportes, Marketing) y *Configuración* (Usuarios, Automatizaciones, Alertas automáticas). Renombrar "Notificaciones" a "Alertas automáticas" y darle un ícono distinto a Material | QA2-008 (mismo problema de nombres en otros portales) |
| **PO-002** | **El dashboard muestra conteos, pero no lo que hay que resolver hoy.** Tiene KPIs (alumnos, cursos, ingresos del mes, pagos pendientes y reclamos), 4 gráficos y "Actividad reciente". No muestra: monto adeudado (solo la cantidad de pagos), alumnos en riesgo (el módulo existe, pero no llega al dashboard), cursos casi llenos o con cupo libre, ni si los crons corrieron | `director/page.tsx:52-170, 228-232` | La Directora tiene que entrar a 4 pantallas para saber si hay algo urgente. En la defensa, el dashboard es la primera pantalla: tiene que contar la historia del producto | Agregar una franja *"Requiere tu atención"* con: $ adeudado y cantidad de morosos, alumnos en riesgo alto (link a `/director/risk`), cursos con ocupación ≥ 90% o ≤ 30%, y el estado de la última corrida de automatizaciones. Usar los umbrales del cliente (BA-002) en los gráficos | QA1-002 y DEV-033 (los conteos no coinciden); BA-019 |
| **PO-003** | **El saludo y el "mes" del dashboard se calculan con la hora del servidor.** En Vercel es UTC: después de las 21:00 de Argentina dice "Buenos días", y el 1° del mes a la noche los ingresos del mes arrancan de cero | `director/page.tsx:79,170` (`new Date()`, `getHours()`) | Detalle visible en la demo, que se presenta de tarde o de noche | Resolver con el helper `todayAR` de DEV-032. No hace falta un ticket aparte: agregarlo al criterio de aceptación de DEV-032 | DEV-032 |
| **PO-004** | **Ningún listado tiene paginación ni filtros por estado.** Solo Alumnos tiene búsqueda. Pagos, Inscripciones, Notas y Comunicaciones crecen sin límite | `modules/*/components/*List.tsx` (ninguno pagina); `director/students/page.tsx:49` es la única búsqueda | Con datos reales (cientos de alumnos y miles de cuotas por año) las listas se vuelven inusables y lentas | Paginación del lado del servidor y filtros por estado y curso en Pagos, Inscripciones y Notas. Búsqueda en Pagos (por alumno) | QA1 (17 alumnos y 29 comunicaciones sin paginar); DEV-033 (corte de 1000 filas) |
| **PO-005** | **Marketing sigue en el producto aunque la Directora pidió sacarlo** (SCRUM-187), y la campaña anterior le cargó bugs (SCRUM-255). Está a medio camino: sin ABM completo (D-03, D-04) | `Sidebar.tsx:60`; SCRUM-187 abierto | Si se mantiene, hay que completarlo. Si no, cada bug que se le arregla es trabajo tirado | **Decisión de PO a cerrar en esta campaña:** ocultarlo del menú con un feature flag (no borrar el código: sirve para mostrar la evolución del alcance) y cerrar SCRUM-255 como *Won't do*. Confirmarlo con el cliente (I-09) | SCRUM-187, SCRUM-255, I-09 |

### 3.3 Administrativo

| ID | Hallazgo | Evidencia | Impacto | Propuesta | Rel. |
|---|---|---|---|---|---|
| **PO-006** | **Las cuotas se cargan una por una.** No hay generación mensual masiva: `payments/actions.ts` solo tiene `createPaymentAction` (individual) | `modules/payments/actions.ts:22` | Es la tarea más repetitiva del instituto: 1 cuota × alumno × mes, del orden de cientos por mes. Es la razón principal por la que una administrativa volvería a la planilla | Botón *"Generar cuotas del mes"* (por curso o para todos los alumnos activos), con vencimiento el día 10 e idempotente (no duplica). Es el MVP de BA-018 y conviene separarlo de la matrícula y de los precios por curso (SCRUM-179/181), que dependen de I-03 | BA-018, SCRUM-179 |
| **PO-007** | **No hay vista de cursos ni de cupos en su portal.** Inscribe alumnos sin poder consultar horarios, docente ni vacantes, y la sección Cursos le da 403 | `Sidebar.tsx:72-81` (sin Cursos); `proxy.ts` bloquea `/director/courses` | Para responder "¿hay lugar el martes a la tarde?" tiene que probar inscribiendo | Una vista **de solo lectura** `/administrativo/courses`: horario, docente, ocupación y lista de espera cuando exista | BA-020 |
| **PO-008** | **El portal "Reportes" está roto para este rol.** Muestra estadísticas y botones de descarga que devuelven 403. Hoy es la peor experiencia del portal: el botón existe y no anda | SCRUM-245, DEV-024 | Pérdida de confianza en todo el portal | Resolverlo con SCRUM-245: habilitar los 3 reportes al administrativo (decisión I-08 de `hallazgos.md`). Mientras tanto, ocultar los botones | SCRUM-245 |
| **PO-009** | **Su dashboard calca el del director** (mismos KPIs) en vez de mostrar su agenda: vencimientos de la semana, cobros de hoy, inscripciones pendientes y ausentes del día para llamar | `administrativo/page.tsx` (estructura igual a la de `director/page.tsx`) | No le ahorra trabajo: lo informa, pero no le dice qué hacer | Rediseñar como lista de tareas: *"Cobros de hoy"*, *"Vencen esta semana (N)"*, *"Morosos a contactar"* con teléfono y *"Ausentes de hoy"* | BA-022 (aviso de 2 ausencias) |

### 3.4 Profesor

| ID | Hallazgo | Evidencia | Impacto | Propuesta | Rel. |
|---|---|---|---|---|---|
| **PO-010** | **El panel docente no le dice nada que no sepa.** Lista sus cursos y tiene dos accesos directos (asistencia y notas). No muestra: la clase de hoy, alumnos con asistencia baja o notas bajo el mínimo, notas pendientes de cargar ni autoevaluaciones con intentos nuevos. El detalle del curso muestra ocupación, pero no el estado académico de cada alumno | `profesor/page.tsx` (60 líneas); `profesor/courses/[id]/page.tsx:133-136`; `evidencias/PO-panel-docente.png` | El docente es quien puede actuar sobre el riesgo de abandono, pero el sistema no le muestra el riesgo: solo lo ve Dirección. Es el diferencial del producto y no llega al usuario que puede usarlo | En el panel: una tarjeta *"Hoy: Lun/Mié 18:00 — E2E Inglés Intermedio → Tomar lista"* y otra *"Alumnos a seguir"* (bajo el umbral de asistencia o de nota, con los mismos umbrales de BA-002 y BA-019). En el detalle del curso, una tabla por alumno con % de asistencia, promedio y estado (promociona / en riesgo) | BA-019, DEV-038 |
| **PO-011** | **Tomar lista lleva un paso de más.** "Registrar asistencia" lleva a un listado; después hay que elegir el curso en un select y confirmar la fecha. Esto pasa aunque el docente tenga un solo curso y la clase sea hoy | `profesor/page.tsx:47-50`; `evidencias/PO-tomar-asistencia-docente.png` | Es la acción más frecuente del docente (2 veces por semana por curso) | Si hay una clase hoy según `class_days`, el acceso directo va derecho a `/profesor/attendance/new?courseId=…` con la fecha de hoy. Si tiene un solo curso, preseleccionarlo | DEV-011 y DEV-037 (validación server-side de curso y fecha) |
| **PO-012** | **El docente no tiene canal de salida.** Recibe "Mensajes", pero no puede enviar un aviso a su curso ("mañana no hay clase") ni abrir un reclamo: `createComplaintAsProfesorAction` existe, pero no tiene UI | `notifications/actions.ts:22` (solo director y administrativo); E-02 de `hallazgos.md`; DEV-046 | El aviso al curso se hace por fuera del sistema (WhatsApp), que es justo lo que el anteproyecto quería reemplazar (F-06) | Permitir que el profesor envíe una notificación **solo a los alumnos de sus cursos**, validando la propiedad con el helper de DEV-010. Conectar o eliminar la action de reclamo del profesor | E-02, DEV-046 |

### 3.5 Alumno

| ID | Hallazgo | Evidencia | Impacto | Propuesta | Rel. |
|---|---|---|---|---|---|
| **PO-013** | **El alumno no sabe si va a promocionar.** Ve su % de asistencia y sus notas por separado, coloreadas con umbrales fijos en el código (`score >= 7`, `>= 5`), pero no ve el mínimo exigido ni un estado *"Vas bien / En riesgo / No cumplís"*. Su panel tampoco muestra el próximo horario de clase con el día, ni las autoevaluaciones pendientes, ni el material | `alumno/grades/page.tsx:16-18`; `alumno/attendance/page.tsx:80`; `alumno/page.tsx` | El alumno descubre que no promociona al cierre de ciclo. Es la pregunta que más le importa y la que la app no contesta | En el panel, una tarjeta *"Tu cursada"* con asistencia vs. mínimo, promedio vs. mínimo y estado, leyendo los umbrales de una sola fuente (BA-001/002). Agregar accesos a Autoevaluaciones y Material, y la lista de pagos con formato de moneda y fecha (hoy `alumno/page.tsx` muestra la fecha en crudo, `AAAA-MM-DD`, y el monto sin separador de miles) | BA-001, BA-002, SCRUM-260 |
| **PO-014** | **Estando restringido por mora, o si falla la base, el alumno no recibe un mensaje claro.** Con la conexión de Drizzle colgada, el login del alumno no termina nunca (más de 120 s) y no muestra ningún error. La restricción por mora tampoco se explica ni se levanta al pagar | Recorrido de este documento (login alumno colgado); DEV-031; QA1-016 | El primer contacto del alumno con el sistema puede ser una pantalla en blanco | Además del fix técnico (pool, `statement_timeout`, `error.tsx`: DEV-022, DEV-042, QA1-016), definir mensajes de producto: *"No pudimos cargar tus datos, reintentá"* y *"Tu acceso está restringido por cuotas impagas: acercate a administración"*, con el detalle de lo adeudado | DEV-022, DEV-031, DEV-042, QA1-016, BA-008, BA-009 |

Del lado del alumno, el recibo y el certificado (BA-016) y los reclamos en el menú (BA-015) ya están cubiertos por BA. Se suman al bloque de alumno de la campaña.

### 3.6 Transversal y defensa de la tesis

| ID | Hallazgo | Evidencia | Propuesta | Rel. |
|---|---|---|---|---|
| **PO-015** | **No hay datos de demo realistas ni un guion de demo.** El seed E2E crea datos con prefijo `E2E` ("E2E Inglés Intermedio", "Profesor E2E"), y vive en producción (DEV-005). Para la defensa hace falta un instituto creíble: unos 60 alumnos, 6 cursos y 3 meses de asistencia, notas y pagos, con casos de mora, riesgo y promoción, y que los gráficos y el módulo de riesgo muestren algo | `scripts/seed-e2e.ts`; screenshots | Un `seed:demo` sobre el proyecto Supabase separado de DEV-005, con nombres realistas, y un **guion de demo por rol** de 10 minutos que recorra las historias de valor (inscripción con cupo, toma de lista, alerta de riesgo, cobro y recibo, promoción y certificado, autoevaluación IA) | DEV-005 |
| **PO-016** | **Las métricas de gestión del proyecto quedan cortadas en el Sprint 8.** `metricas-sprints.md` cubre hasta el Sprint 8, el Sprint 9 no tiene SP ni avance, y esta campaña no tiene sprint | §1.2 | Cerrar el Sprint 9 con su retrospectiva, abrir el sprint de la campaña con objetivo y SP, y actualizar `metricas-sprints.md` al cierre. Es la evidencia de Scrum que evalúa la materia | — |
| **PO-017** | **`CLAUDE.md` y la documentación describen un producto distinto del real:** pendientes que ya están cerrados, "material por curso" y umbrales viejos | §2.3 | Una tarea de documentación al final de la campaña, junto con BA-030 | BA-030, BA-031 |

---

## 4. Estructura propuesta para la carga en Jira

### 4.1 Principios

- **Una épica por objetivo de la campaña, no por fuente** (QA, DEV, BA, PO). La fuente se lleva como label. Así el roadmap muestra qué se mejora, no quién lo encontró.
- **Los tickets existentes se reusan.** Lo que ya está en SCRUM-234..260 o en el backlog previo se **re-parentea** a la épica nueva y se le agrega el label de la campaña. No se crea un duplicado.
- **La prioridad se usa de verdad** (hoy todo está en `Medium`), y la severidad pasa a la prioridad. Los labels `severidad-*` se mantienen por compatibilidad, pero dejan de ser la fuente.

### 4.2 Épicas

| Épica (nueva salvo indicación) | Objetivo | Contenido típico |
|---|---|---|
| **E1 · QA-2026-10 · Seguridad y datos de producción** | Que nadie pueda tomar cuentas, escalar permisos ni leer datos ajenos, y que los tests no toquen producción | DEV-001, 002, 003, 004, 005, 007, 009, 010, 011, 012, 013, 014, 015, 028. Absorbe SCRUM-246, 250, 251, 259 (`registerAction`), 239 y 155 |
| **E2 · QA-2026-10 · Reglas de negocio del cliente** | Que el sistema haga cumplir, en el servidor, las reglas vigentes de la Directora | BA-001..003, 006, 010..014, 017, 019, 025, 027; DEV-020, 021, 023, 030, 034, 036, 037. Absorbe SCRUM-188, 190, 244, 247, 248, 249, 240 y 252. **Se reusa SCRUM-191 como épica** si se prefiere no crear otra: ya es "Ajustes de negocio con la Directora" |
| **E3 · QA-2026-10 · Cobranza y automatizaciones confiables** | Mora, alertas y crons que funcionen sin intervención y sin duplicar | DEV-025, 026, 027, 029, 031, 041; BA-007, 008, 009; PO-006. Vincula SCRUM-206/207/209/215 |
| **E4 · QA-2026-10 · Integridad de datos y formularios** | Que ninguna operación falle en silencio, guarde a medias o pierda datos | SCRUM-234, 235, 236, 242, 243, 254, 256, 257, 258; DEV-017, 018, 019, 022, 033, 035, 039, 040; BA-005 |
| **E5 · QA-2026-10 · Experiencia por rol** | Que cada rol resuelva su día sin fricción | PO-001..002, 004, 007, 009..014; QA1/QA2 de UX y textos; SCRUM-139, 241, 253, 260; BA-015, 016, 022, 028, 029. **Se reusa SCRUM-194** (UX y responsive) como épica |
| **E6 · QA-2026-10 · Rendimiento e infraestructura** | Que la app sea operable con varios usuarios y desde Córdoba | DEV-006, 008, 042; QA1-016; BA-032; PO-014 (parte técnica); SCRUM-123 (verificación) y 238 (cierre) |
| **E7 · QA-2026-10 · Defensa y documentación** | Demo creíble y documentación consistente con el producto | PO-015, 016, 017; BA-030, 031; actualización de `CLAUDE.md` y `metricas-sprints.md` |
| *(se mantiene)* SCRUM-178 · Rediseño de pagos | Fuera de la campaña de pulido: depende de I-02 e I-03 | SCRUM-179..185, BA-004 y BA-018 (salvo el MVP de PO-006, que va en E3) |

Las épicas SCRUM-128, 167, 170 y 195 se cierran (§1.3). SCRUM-150 se cierra cuando se cierren sus tareas (§2.1).

### 4.3 Labels

| Label | Uso |
|---|---|
| `qa-2026-10` | **Todo** issue creado o tocado en esta campaña, incluidos los existentes que se re-parentean. Filtro principal: `labels = qa-2026-10` |
| `origen-qa1`, `origen-qa2`, `origen-ba`, `origen-po`, `origen-dev` | Quién lo encontró, para medir la campaña. Si un issue tiene varias fuentes, lleva varios labels |
| `seguridad`, `privacidad` | Ya existen. Se mantienen |
| `regla-negocio` | Issues que cambian o hacen cumplir una regla del cliente (trazables a la matriz BA) |
| `defensa-tesis` | Lo que tiene que estar listo antes del coloquio, crucen o no otra épica. Filtro de la demo |
| `bloqueado-cliente` | Issues que esperan una respuesta de I-01..I-09 o Q-01..Q-06 |
| `regresion` | Algo que funcionó y se rompió (por ejemplo SCRUM-236 respecto de SCRUM-93) |
| `retroactivo` | Historias creadas para trabajo ya hecho sin ticket (§2.4) |
| `template` | Ya existe (SCRUM-159). Excluirlo del board |

Se **deja de usar** `severidad-media-alta`: la severidad pasa a la prioridad.

### 4.4 Prioridad (mapeo severidad → prioridad de Jira)

| Severidad (QA/DEV) | Prioridad Jira | Criterio |
|---|---|---|
| Crítica | **Highest** | Explotable hoy o con riesgo de pérdida de datos de producción |
| Alta | **High** | Rompe un flujo core, pierde datos en silencio o contradice una regla del cliente que se defiende |
| Media | **Medium** | Funciona con un workaround, o es un problema de integridad acotado |
| Baja | **Low** | Cosmético, texto o deuda técnica |

El MoSCoW se decide en la fase 2 y se registra en la descripción (`MoSCoW: Must`) o con los labels `must`, `should`, `could` y `wont`, según lo que permita el proyecto team-managed.

### 4.5 Componentes

El proyecto es team-managed y hoy no tiene componentes. **Propuesta:** no depender de componentes y usar labels con prefijo `mod-`, alineados con `src/modules/*`:

`mod-auth`, `mod-usuarios`, `mod-alumnos`, `mod-docentes`, `mod-cursos`, `mod-inscripciones`, `mod-asistencia`, `mod-notas`, `mod-pagos`, `mod-notificaciones`, `mod-reclamos`, `mod-promociones`, `mod-cierre-ciclo`, `mod-autoevaluaciones`, `mod-eval-docentes`, `mod-material`, `mod-marketing`, `mod-reportes`, `mod-riesgo`, `mod-automatizaciones`, `mod-infra`, `mod-ui`.

Si el proyecto permite crear componentes, se crean con los mismos nombres (sin el prefijo) y se mantienen los labels hasta migrar.

### 4.6 Convención de títulos

```
[Severidad] Portal/Módulo: qué pasa (en lenguaje del usuario)
```

- Severidad entre corchetes: `[Crítica]`, `[Alta]`, `[Media]`, `[Baja]`. Sigue la convención de SCRUM-242..260.
- Portal: `Director`, `Administrativo`, `Profesor`, `Alumno`, o `Todos` si es transversal.
- Se describe **el síntoma o el valor**, no la solución. Ejemplos:
  - `[Crítica] Todos/Auth: el link de invitación permite entrar a cualquier cuenta`
  - `[Alta] Profesor/Notas: puede cargar notas en cursos que no son suyos`
  - Historia: `Administrativo/Pagos: generar las cuotas del mes en un paso`
- El ID de origen va en la **primera línea de la descripción**, no en el título: `Origen: DEV-001 · QA1-REF-01 · docs/qa-2026-10/dev-auditoria-tecnica.md`.

### 4.7 Plantilla de descripción

```
Origen: <IDs> · <documento>
Tipo: Bug | Historia | Tarea técnica       Severidad: …   MoSCoW: …
Portal(es): …                              Módulo: …

Como <rol>, quiero <…>, para <…>.          (solo historias)

Pasos / Actual / Esperado                  (solo bugs)
Evidencia: archivo:línea · screenshot
Criterios de aceptación:
- …
- El test test.fail asociado pasa en verde (si existe)
Dependencias: bloqueado por … / bloquea a …
```

### 4.8 Tipos de issue y vínculos

- **Bug:** el sistema hace algo distinto de lo especificado. **Historia:** falta valor (PO y BA de tipo historia). **Tarea:** técnica, de infra o de documentación.
- Vínculos: `duplicates` cuando un hallazgo nuevo coincide con un ticket existente (por ejemplo DEV-017 → SCRUM-242). `relates to` entre el ticket cerrado y su bug derivado (§2.2). `blocks` para las dependencias del cliente.
- **Sub-tareas QA** al estilo de SCRUM-197..205: solo en los issues `Highest` y `High`, para dejar evidencia de verificación.

### 4.9 Sprints propuestos

1. **Cerrar el Sprint 9** (vencido) y pasar sus 10 issues al backlog de las épicas E2 y E4.
2. **Sprint 10 · "Producción segura"** (1 semana): todo lo `Highest` de E1, que según DEV §3 incluye mitigaciones sin código para hacer hoy mismo.
3. **Sprint 11 · "Reglas del cliente y datos sin pérdidas"** (2 semanas): los `High` de E2 y E4. Recupera el objetivo original del Sprint 9.
4. **Sprint 12 · "Cada rol, su día"** (2 semanas): E3, E5 y E7, con `defensa-tesis` primero.

El orden fino y los SP se definen en la fase 2, con el backlog consolidado.
