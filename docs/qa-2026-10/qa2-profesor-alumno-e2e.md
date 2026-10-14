# QA #2 — Portales profesor y alumno, flujos entre roles y aislamiento

Fecha: 13/10/2026 · Tester: QA #2 · Entorno: `localhost:3000` (dev server compartido) · Chromium (Playwright) 1366x900 y 390x844.

> **Estado: cerrado (13/10/2026).** 16 hallazgos: **2 Críticos, 5 Altos, 6 Medios, 3 Bajos**.
> Restricciones de la sesión: la base resultó ser la de **producción**. Desde el aviso de la coordinación solo se creó 1 registro E2E. Después del incidente de QA1 se trabajó en **modo solo lectura**: los flujos cruzados que requieren escribir (tomar asistencia, cargar nota, rendir la autoevaluación, enviar una notificación, subir material, cambiar el avatar, cambiar el estado del reclamo) **no se ejecutaron**, se verificaron hasta el último paso previo al submit y se analizó el código. Las validaciones de formularios se probaron con los POST **bloqueados** en el navegador (`page.route` aborta todo lo que no sea GET). Las pruebas de aislamiento fueron solo GET por URL, sin datos personales reales en este documento.

## Bitácora

- 13/10 — Login por UI de los 4 roles `@e2e.test` OK; se guarda `storageState`.
- 13/10 — Primer recorrido de las pantallas del profesor y del alumno (desktop) con capturas.
- 13/10 — Cortes de red/DNS locales y luego cuelgues de Drizzle: el Dev los diagnosticó como **DEV-047** (pipelining de postgres.js con el pooler `:6543`, ver QA2-011). La coordinación reinició el server en `:5432` y desde ahí todo responde en menos de 3 s.
- 13/10 — Aviso de producción: sin envíos masivos, sin cron, IDOR solo lectura. Después, **stop de toda escritura** por el incidente de QA1. Se verificó el inventario: ninguna acción de QA2 tocó registros reales (ver el final).
- 13/10 — Flujos cruzados en solo lectura, aislamiento por URL, mobile 390x844 y validaciones con los POST bloqueados.

## 1. Matriz de cobertura

| Pantalla / flujo | Estado | Notas |
|---|---|---|
| Login profesor / alumno | ✅ | Redirige al portal correcto (con la red estable) |
| `/profesor` (panel) | ⚠️ | Nivel en inglés (QA2-001) |
| `/profesor/courses/[id]` | ✅ | Datos, cupo 2/15 y alumnos; curso ajeno por URL → 404 ✅ |
| `/profesor/attendance` | ⚠️ | Plural (QA2-003), fecha corrida un día (QA2-012) |
| `/profesor/attendance/new` | ⚠️ | Carga OK; título con fecha corrida (QA2-012); nombres cortados en mobile (QA2-016); curso ajeno por URL → redirige ✅. Guardado no ejecutado (solo lectura) |
| `/profesor/grades` | ⚠️ | Links a `/director/...` (QA2-002), "evaluaciónes" (QA2-003) |
| `/profesor/grades/new` | ⚠️ | Validación cliente OK ("Inscripción requerida"); solo lista alumnos del curso propio ✅; PERSISTE BUG-E |
| `/profesor/assessments` | ✅ | Contadores y tabla OK |
| `/profesor/assessments/new` | ✅ | Carga OK; generación IA no ejecutada (solo lectura) |
| `/profesor/assessments/[id]` | ❌ | Se abren autoevaluaciones de otros cursos (QA2-005) |
| `/profesor/documents` | ❌ | Material global, sin curso y público (QA2-006) |
| `/profesor/notifications` | ✅ | Estado vacío correcto; nombre de menú inconsistente (QA2-008) |
| `/profesor/profile` | ✅ | Nombre vacío → error inline; el teléfono no se valida en el cliente pero sí en el servidor |
| `/alumno` (panel) | ⚠️ | Pagos sin formato y vencidos como "pendientes" (QA2-014) |
| `/alumno/attendance` | ✅ | KPIs y tabla correctos (salvo la diferencia de fecha con el profesor, QA2-012) |
| `/alumno/grades` | ✅ | Agrupa por curso, nivel traducido, promedio |
| `/alumno/assessments` | ✅ | Pendientes/completadas/promedio |
| `/alumno/assessments/[id]` | ❌ | Quiz de otro curso accesible y respuestas en el payload (QA2-010) |
| `/alumno/payments` | ✅ | Formato es-AR, badge "Vencido", total pendiente; mobile OK |
| `/alumno/documents` | ⚠️ | Ve todo el material institucional (QA2-006) |
| `/alumno/notifications` | ✅ | "1 sin leer", "Marcar leída" y "Marcar todas como leídas" visibles |
| `/alumno/complaints` + `/new` | ✅ | Validaciones (categoría, mínimo 20 caracteres), doble clic sin duplicar, acentos y ñ OK |
| `/alumno/evaluations` + `[courseId]` | ⚠️ | Una encuesta ya evaluada se reabre sin `?enrollment=` (QA2-010) |
| `/alumno/profile` | ✅ | Carga OK; avatar no probado (solo lectura) |
| Flujo asistencia profesor → alumno → dirección | ⚠️ | Solo lectura: la clase del seed se ve en los dos portales **con fechas distintas** (QA2-012); `/director/risk` no lista a los E2E (al 100 %, coherente) |
| Flujo notas profesor → alumno → promociones | ✅ (lectura) | Nota 8 del seed visible para profesor, alumno y en `/director/promotions` |
| Flujo autoevaluación IA → alumno → intento | ⚠️ | El quiz E2E se ve en profesor, director y alumno; rendirlo no se ejecutó (solo lectura). La vista del docente muestra solo intentos y promedio, no quién respondió |
| Flujo reclamo alumno → administrativo → alumno | ❌ | El personal no ve ningún reclamo (QA2-013) |
| Flujo notificación dirección → alumno/profesor | ⚠️ | No se envió (solo lectura). Opción de rol "Administradores" inexistente (QA2-007). Badge de la campana OK (SCRUM-122) |
| Flujo material → profesor y alumno del curso | ❌ | No existe material por curso (QA2-006); no se subió nada |
| Flujo pago → alumno | ✅ (lectura) | Los pagos E2E se ven con su vencimiento día 10 y el estado correcto |
| Flujo encuesta → dirección (anonimato) | ❌ | El detalle del Profesor E2E da 404 y la lista dice "0 encuestas" (QA2-015); `enrollment_id` guardado (QA2-009) |
| Perfil y avatar (SCRUM-124) | ⏳ | No verificable en solo lectura (requiere subir avatar); el código ya usa `avatarUrl` |
| Control de acceso entre portales | ✅ | alumno → `/profesor`, `/director`, `/administrativo` redirige a `/alumno`; profesor → `/director`, `/administrativo`, `/alumno` → `/profesor`; anónimo → `/login`; `/api/reports/*` → 403 (profesor) / 401 (anónimo) |
| Aislamiento por URL (IDOR) | ❌ | QA2-005, QA2-010; cursos, resultados y encuestas ajenas → 404 ✅ |
| Mobile 390x844 | ⚠️ | Drawer, topbar con badge y tarjetas OK; nombres cortados al tomar asistencia (QA2-016) |

## 2. Hallazgos

### QA2-001 · El panel del docente muestra el nivel del curso en inglés

- **Tipo:** Texto-i18n · **Severidad:** Baja
- **Rol y ruta:** profesor · `/profesor`
- **Pasos:** entrar como profesor y mirar la tarjeta "Mis cursos activos".
- **Esperado vs actual:** se espera "Intermedio · Lun/Mié 18:00-19:30"; se ve "intermediate · Lun/Mié 18:00-19:30". En el detalle del curso sí dice "INTERMEDIO".
- **Evidencia:** `evidencias/QA2-001-panel-docente-nivel-en-ingles.png`
- **Sospecha técnica:** `src/app/(dashboard)/profesor/page.tsx:35` imprime `{course.level}` sin `LEVEL_LABELS` (viola la convención del CLAUDE.md).
- **Criterio de aceptación:** el panel muestra el nivel con `LEVEL_LABELS[course.level] ?? course.level`.

### QA2-002 · El listado de notas del profesor enlaza a rutas del portal de dirección

- **Tipo:** Bug · **Severidad:** Media
- **Rol y ruta:** profesor · `/profesor/grades`
- **Pasos:** 1) Entrar como profesor a "Cargar Notas". 2) Hacer clic en una fila (o en el ojo). 3) Con un profesor sin notas, el botón del estado vacío "+ Cargar nota".
- **Esperado vs actual:** se espera ver el detalle o editar la nota dentro de `/profesor/...`. Las filas apuntan a `/director/grades/[id]` y el estado vacío a `/director/grades/new`. **Verificado:** al hacer clic en la fila de "Alumno E2E" el profesor termina en `/profesor` (el panel), sin ver la nota y sin ningún mensaje. Tampoco hay forma de corregir una nota mal cargada desde el portal profesor, aunque `updateGradeAction` acepta el rol profesor.
- **Evidencia:** `evidencias/QA2-002-notas-profesor-links-director.png`
- **Sospecha técnica:** `src/modules/grades/components/GradeList.tsx:47,66,117` tienen los `href` fijos a `/director/...`; el componente se reutiliza en `profesor/grades/page.tsx:59`. Además el estado vacío usa un SVG inline en vez de Lucide.
- **Criterio de aceptación:** `GradeList` recibe una `basePath` (o `role`) y en el portal profesor enlaza a rutas del profesor (o no muestra el ojo si no hay detalle); ningún link del portal profesor apunta a `/director`.

### QA2-003 · Errores de plural y ortografía en los subtítulos del profesor

- **Tipo:** Texto-i18n · **Severidad:** Baja
- **Rol y ruta:** profesor · `/profesor/grades`, `/profesor/attendance`
- **Pasos:** abrir ambas pantallas con 2 notas y 1 clase cargadas.
- **Esperado vs actual:** "2 evaluaciones registradas" y "Última clase registrada"; actual "2 evaluaci**ó**nes registradas" (tilde de más) y "Últimas 1 clases registradas".
- **Evidencia:** `evidencias/QA2-003-notas-evaluaciones-tilde.png`, `evidencias/QA2-003-asistencia-plural.png`
- **Sospecha técnica:** `profesor/grades/page.tsx:41` arma `evaluación` + `es`; `profesor/attendance/page.tsx:84` (y lo mismo en `director/attendance/page.tsx:64` y `administrativo/attendance/page.tsx:64`) no contempla el singular.
- **Criterio de aceptación:** textos correctos para 0, 1 y N registros.

### QA2-004 · Las Server Actions de asistencia, notas y autoevaluaciones no verifican que el curso sea del profesor

- **Tipo:** Seguridad · **Severidad:** Alta
- **Rol y ruta:** profesor · acciones de `attendance`, `grades`, `assessments`
- **Pasos (no ejecutado, por estar en producción):** un profesor autenticado puede invocar la Server Action con un `courseId` / `enrollmentId` / `id` de otro curso (por ejemplo reenviando el POST del formulario con otro valor).
- **Esperado vs actual:** se espera que el servidor rechace operar sobre cursos ajenos. Las páginas sí filtran (por ejemplo `profesor/attendance/new` redirige si el curso no es propio), pero las acciones solo hacen `requireRole([...,"profesor"])`:
  - `recordAttendanceAction`, `updateAttendanceAction`, `deleteAttendanceSessionAction` (`src/modules/attendance/actions.ts:12,119,153`): un profesor puede cargar, modificar o **borrar** la asistencia de cualquier curso.
  - `createGradeAction`, `updateGradeAction`, `deleteGradeAction` (`src/modules/grades/actions.ts:43,88,128`): cualquier nota de cualquier alumno.
  - `generateAssessmentProfesorAction` (`assessments/actions.ts:217`) acepta cualquier `courseId`; `publishAssessmentProfesorAction` y `archiveAssessmentProfesorAction` (`:303,:336`) publican o archivan cualquier autoevaluación, y publicar **envía emails** a los alumnos de ese curso.
- **Evidencia:** revisión de código (no se ejecutó la explotación por la restricción de producción).
- **Criterio de aceptación:** cada acción invocada por un profesor verifica que el `courseId` (o el curso de la inscripción, nota o autoevaluación) tenga `teacher_id` = docente logueado; si no, devuelve error "No autorizado". Test que lo cubra.

### QA2-005 · El profesor puede abrir autoevaluaciones de cursos ajenos por URL

- **Tipo:** Seguridad · **Severidad:** Media
- **Rol y ruta:** profesor · `/profesor/assessments/[id]`
- **Pasos:** como profesor, abrir `/profesor/assessments/<id de una autoevaluación de otro curso>`.
- **Esperado vs actual:** se espera 404. La página llama a `getAssessmentDetail(id)` sin comparar el curso con el docente, y muestra preguntas, respuestas correctas y los botones Publicar/Archivar.
- **Verificado por GET (solo lectura):** con profesor@e2e.test, que tiene 1 sola autoevaluación propia, se abrieron 4 autoevaluaciones de otros cursos. Las 4 responden 200 con las 10 preguntas, la respuesta correcta marcada, las explicaciones, las estadísticas (intentos y promedio) y el botón **"Archivar"** de un curso ajeno (no se presionó).
- **Evidencia:** `evidencias/QA2-005-profesor-ve-autoevaluacion-ajena.png` (curso "Adults 4 · Nivelación"). Código: `src/app/(dashboard)/profesor/assessments/[id]/page.tsx:29`.
- **Criterio de aceptación:** la página devuelve `notFound()` si el curso de la autoevaluación no es del docente.

### QA2-006 · El "material" no está asociado a un curso: es global y público

- **Tipo:** Feature faltante · **Severidad:** Alta
- **Rol y ruta:** profesor · `/profesor/documents`; alumno · `/alumno/documents`; director · `/director/documents`
- **Pasos:** abrir "Material" como profesor: el título es "Material institucional" y el formulario "Subir documento" no pide curso.
- **Esperado vs actual:** el requisito (y el CLAUDE.md: "Material/documentos por curso") pide material **por curso**, visible para el profesor y los alumnos de ese curso. Actual: la tabla `documents` no tiene `course_id` (`src/lib/drizzle/schema.ts:419`), `getDocuments()` devuelve todo a todos los roles, y el archivo queda en un bucket con URL pública (`documents/actions.ts`, `getPublicUrl`), accesible sin login. El profesor tampoco puede borrar lo que él mismo subió (`canDelete={false}`).
- **Consecuencia para el QA:** **no se subió ningún documento**, porque lo verían todos los alumnos reales. El flujo "documento del curso → lo ven profesor y alumno" queda ❌ por diseño.
- **Evidencia:** `evidencias/QA2-006-material-profesor-sin-curso.png`
- **Criterio de aceptación:** `documents.course_id` (nullable para material institucional), selector de curso al subir, el alumno solo ve material de sus cursos e institucional, URLs firmadas o bucket privado, y el profesor puede dar de baja lo que subió.

### QA2-007 · El formulario de notificaciones ofrece el rol "Administradores" (inexistente) y no ofrece "administrativo"

- **Tipo:** Bug · **Severidad:** Media
- **Rol y ruta:** director / administrativo · `/director/notifications/new` (flujo cruzado de notificaciones)
- **Pasos:** Destinatario "Rol" → abrir el select.
- **Esperado vs actual:** se esperan los roles reales (`director`, `administrativo`, `profesor`, `alumno`). Aparece "Administradores" con valor `role:admin`, rol renombrado a `director` en la migración 0002, y no existe una opción para el personal administrativo. Enviar a `role:admin` probablemente falla al castear el enum o no llega a nadie (**no ejecutado**: los envíos por rol llegan a usuarios reales).
- **Sospecha técnica:** `src/modules/notifications/components/NotificationForm.tsx:73-75`.
- **Criterio de aceptación:** las opciones de rol coinciden con el enum `role`; enviar a cada rol llega solo a ese rol.

### QA2-008 · El menú dice "Mensajes" y la pantalla "Mis notificaciones"

- **Tipo:** Mejora UX · **Severidad:** Baja
- **Rol y ruta:** profesor (y alumno) · `/profesor/notifications`
- **Esperado vs actual:** el mismo nombre en el menú, el título y la campana. Hoy el menú dice "Mensajes", el título "Mis notificaciones" y la campana tiene `aria-label` "Notificaciones".
- **Evidencia:** `evidencias/QA2-008-mensajes-vs-notificaciones.png`
- **Criterio de aceptación:** unificar en "Notificaciones".

### QA2-009 · La encuesta docente "anónima" guarda el `enrollment_id` del alumno

- **Tipo:** Seguridad (privacidad) · **Severidad:** Media
- **Rol y ruta:** alumno · `/alumno/evaluations/[courseId]` → director · `/director/teacher-evaluations`
- **Esperado vs actual:** la justificación D-08 de `hallazgos.md` dice que la anonimidad es la condición de la encuesta. `submitSurvey` guarda `enrollment_id` (`teacher-evaluations.service.ts:57-66`), que identifica unívocamente al alumno: cualquiera con acceso a la base, o una vista futura, puede saber quién puso qué. Pendiente: verificar en la UI de dirección si se ve algo que identifique al alumno.
- **Criterio de aceptación:** guardar la marca de "ya respondió" en una tabla aparte (enrollment → bool) sin vincular la respuesta, o un hash no reversible; la vista de dirección no permite inferir al autor (por ejemplo, ocultar los comentarios cuando hay menos de N respuestas).

### QA2-010 · La encuesta docente y el intento de autoevaluación no validan que el alumno esté inscripto

- **Tipo:** Seguridad · **Severidad:** Alta
- **Verificado por GET (solo lectura, sin responder ni enviar nada):**
  - `/alumno/assessments/<id>` de **otro curso** ("Adults 4 · Nivelación", publicada): el alumno E2E ve el quiz completo, "Pregunta 1 de 10", listo para responder. Pasó con 2 de 4 IDs ajenos; los otros 2 dan 404 porque no están publicados.
  - En el HTML/RSC del quiz propio viaja `explanation` antes de responder ("Tercera persona del singular en present simple: **goes**"), o sea, la respuesta.
  - `/alumno/evaluations/617e552d…` **sin** `?enrollment=`: aunque la lista dice "Evaluado", el formulario de la encuesta se vuelve a abrir y queda listo para enviar otra vez (no se envió).
  - `/alumno/evaluations/<curso ajeno>` → 404 ✅ (el form no se abre, pero la acción igual aceptaría el POST).
  - `/alumno/assessments/<id>/resultado` de intentos ajenos → 404 ✅.
- **Evidencia adicional:** `evidencias/QA2-010-alumno-abre-quiz-de-otro-curso.png`, `evidencias/QA2-010-alumno-encuesta-ya-evaluada-reabre.png`.
- **Rol y ruta:** alumno · `submitSurveyAction`, `submitAttemptAction`, `/alumno/assessments/[id]`, `/alumno/evaluations/[courseId]`
- **Pasos (no ejecutado):** un alumno envía la acción con un `courseId`/`teacherId` de otro curso, o sin `enrollmentId`.
- **Esperado vs actual:** se espera el rechazo. `submitSurveyAction` (`teacher-evaluations/actions.ts:11`) toma `teacherId`/`courseId` del form, sin verificar la inscripción; sin `enrollmentId` no hay control de duplicados, así que un alumno podría **inflar o hundir la calificación de cualquier docente**. `alumno/assessments/[id]/page.tsx:18` y `submitAttemptAction` (`assessments/actions.ts:349`) no verifican que la autoevaluación sea de un curso del alumno, y `QuizPlayer` recibe `correct` y `explanation` en las props del cliente (las respuestas viajan al navegador antes de responder).
- **Criterio de aceptación:** las acciones verifican que exista una inscripción activa del alumno en el curso; `enrollmentId` es obligatorio y se deriva del servidor; la página de quiz devuelve 404 para cursos ajenos; las respuestas correctas no se envían al cliente hasta confirmar cada pregunta (o se corrige en el servidor).

### QA2-011 · El portal alumno se congela entero tras unas pocas navegaciones (conexión única de Drizzle bloqueada)

- **Tipo:** Bug / Rendimiento · **Severidad:** Crítica
- **Rol y ruta:** alumno · todo `/alumno/*` (también afecta el login del alumno, que redirige a `/alumno`)
- **Pasos (con red estable, después del reinicio del dev server de las 15:5x):**
  1. Login alumno por UI → OK.
  2. `/alumno` 2,5 s ✅ → `/alumno/attendance` 1,7 s ✅ → `/alumno/grades` 1,6 s ✅.
  3. `/alumno/assessments` → **no responde en 120 s**.
  4. Desde ahí **todas** las rutas `/alumno/*` quedan colgadas (curl: 0 bytes en 45 s), mientras que `/director/students` responde en 0,7 s y el portal profesor sigue andando.
- **Esperado vs actual:** cada página responde en pocos segundos o muestra un error. Actual: el request queda abierto para siempre, el navegador muestra el skeleton de `loading.tsx` sin fin y la pestaña llega a crashear ("Page crashed"). No hay timeout ni mensaje de error. Ya había pasado antes del reinicio; el Dev registra el cuelgue posterior al corte de red, pero **este se reprodujo con la red estable y el server recién reiniciado**.
- **Evidencia:** log de la corrida (`scratchpad/qa2/crawl.js`): `/alumno/assessments ERR page.goto: Timeout 120000ms` y, a continuación, `/alumno/payments`, `/alumno/documents`, `/alumno/notifications` con timeout y `Page crashed`; curl `alumno/payments 000 45.0s 0 bytes` y `director/students 200 0.69s` en el mismo minuto.
- **Sospecha técnica:** `src/lib/drizzle/index.ts` usa `max: 1` sobre el pooler en modo transacción, sin `statement_timeout` ni timeout de socket. `src/app/(dashboard)/alumno/layout.tsx:13` hace una query Drizzle (`isStudentAccessRestricted`) y Next renderiza **layout y page en paralelo**, así que cada página del alumno que también usa Drizzle (`/alumno`, `/alumno/assessments`, `/alumno/assessments/[id]`, que además usa `Promise.all`) dispara dos queries concurrentes sobre la única conexión. Es el mismo patrón de la memoria interna "No Promise.all with db.* queries" y del sitio E-01 de `hallazgos.md`. El portal profesor no lo sufre porque su layout no consulta Drizzle. Esto contradice la nota de `qa-backlog.md` que daba la memoria por "desactualizada".
- **Causa raíz confirmada por el Dev (DEV-047):** el pipelining de postgres.js no funciona con el pooler en modo transacción (`:6543`), así que cualquier par de queries concurrentes deja colgada la única conexión. Con el dev server apuntando a `:5432`, 6 páginas en paralelo cargan en menos de 3 s.
- **Criterio de aceptación:** navegar las 11 pantallas del alumno 3 veces seguidas sin cuelgues; si la base no responde, error visible en menos de 15 s (por ejemplo `statement_timeout` o `idle_in_transaction_session_timeout`, más un `error.tsx`); revisar `max: 1` o mover la verificación de `accessRestricted` a Supabase o a la misma query de la página.

### QA2-012 · Las fechas de clase se muestran un día antes en el portal profesor (zona horaria)

- **Tipo:** Bug · **Severidad:** Alta
- **Rol y ruta:** profesor · `/profesor/attendance/new?courseId=…&date=2026-10-05`, `/profesor/attendance`
- **Pasos:** 1) Tomar asistencia, elegir el curso E2E y la fecha 05/10/2026 → "Cargar". 2) Comparar el listado de asistencia del profesor con el del alumno para la misma clase.
- **Esperado vs actual:** se espera "Clase del 5/10/2026". Se ve **"Clase del 4/10/2026"**, con el input mostrando 05/10/2026. La clase sembrada aparece como **12/10/2026** en `/profesor/attendance` y como **13/10/2026** en `/alumno/attendance`: profesor y alumno ven fechas distintas para la misma clase. Un docente que valida la fecha por el título puede cargar la asistencia del día equivocado.
- **Evidencia:** `evidencias/QA2-012-asistencia-fecha-corrida.png`, `evidencias/QA2-003-asistencia-plural.png` (12/10) vs `evidencias/QA2-012-alumno-asistencia-13-10.png` (13/10).
- **Sospecha técnica:** `new Date("2026-10-05")` se interpreta como medianoche UTC y `toLocaleDateString("es-AR")` lo pasa a UTC-3 → día anterior. `profesor/attendance/new/page.tsx` (título "Clase del …") y `profesor/attendance/page.tsx` (columna Fecha). Además `today = new Date().toISOString()` (UTC) precarga el día siguiente después de las 21:00 de Argentina. Revisar el mismo patrón en `ComplaintList.tsx:70` y en el resto (`grep "new Date(.*Date)"`).
- **Criterio de aceptación:** las fechas tipo `date` (sin hora) se formatean sin pasar por `Date` UTC (por ejemplo, `split("-")` o `timeZone: "UTC"`); profesor, alumno y dirección ven la misma fecha para la misma clase; la fecha por defecto es la de hoy en `America/Argentina/Cordoba`.

### QA2-013 · Dirección y administrativo no ven ningún reclamo: el flujo de reclamos está roto

- **Tipo:** Bug · **Severidad:** Crítica
- **Rol y ruta:** alumno `/alumno/complaints/new` → administrativo `/administrativo/complaints` y director `/director/complaints`
- **Pasos:** 1) Como alumno, crear el reclamo "E2E QA2 Reclamo de prueba: …" (Académico). 2) El alumno lo ve en "Mis reclamos" (2 reclamos: el del seed y el nuevo). 3) Entrar como administrativo a Reclamos (pestaña "Todos"). 4) Lo mismo como director.
- **Esperado vs actual:** el personal ve los reclamos de todos los usuarios y puede cambiarles el estado. Actual: **"0 abiertos · Sin reclamos — No hay reclamos registrados."** para los dos roles, ni siquiera el del seed. Por eso no se pudo continuar el flujo (cambio de estado → el alumno lo ve). No aparece ningún error en pantalla.
- **Evidencia:** `evidencias/QA2-013-alumno-ve-sus-reclamos.png`, `evidencias/QA2-013-administrativo-sin-reclamos.png`.
- **Sospecha técnica:** `administrativo/complaints/page.tsx:20-24` y `director/complaints/page.tsx:20` consultan con el cliente Supabase **con la sesión del usuario** (sujeto a RLS) y descartan el `error`. Lo más probable es que la política RLS de `complaints` solo deje ver las filas propias (o siga referenciando el rol `admin`, ver el bloque comentado de `migrations/0001_add_administrativo_role.sql`), o que falle el embed `profiles!user_id`. El servicio Drizzle `getAllComplaints()` (`complaints.service.ts:7`), que no pasa por RLS, existe pero no se usa. Puede estar duplicado con QA #1.
- **Problemas adicionales del mismo flujo (por código):** a) no existe un campo de **respuesta** al alumno: `updateComplaintStatusAction` solo cambia el estado, y el alumno no tiene detalle del reclamo; b) el cambio de estado no genera una notificación al alumno ni revalida `/alumno/complaints`; c) en el portal administrativo las filas enlazan a `/director/complaints/[id]` (`ComplaintList.tsx:62`); d) `createComplaintAction` no llama a `requireRole` (convención del proyecto).
- **Criterio de aceptación:** director y administrativo ven todos los reclamos (incluido el del seed), pueden cambiar el estado y escribir una respuesta; el alumno ve el estado y la respuesta y recibe una notificación; si la query falla se muestra un error, no "Sin reclamos".

### QA2-014 · El panel del alumno muestra los pagos vencidos como "pendientes" y sin formato

- **Tipo:** Texto-i18n / Mejora UX · **Severidad:** Media
- **Rol y ruta:** alumno · `/alumno`
- **Pasos:** entrar como alumno con 2 cuotas vencidas (10/09 y 10/10).
- **Esperado vs actual:** en `/alumno/payments` se ven bien ("10/10/2026", "$15.000", badge "VENCIDO", total "$30.000"). En el panel la tarjeta dice "**Pagos pendientes** · Vence: 2026-10-10 · $15000.00": fecha ISO, monto sin separador de miles y con decimales en inglés, y sin indicar que está vencido. La tarjeta tampoco enlaza a "Pagos".
- **Evidencia:** `evidencias/QA2-014-panel-alumno-pagos-sin-formato.png`
- **Sospecha técnica:** `src/app/(dashboard)/alumno/page.tsx` imprime `dueDate` y `amount` crudos.
- **Observación relacionada:** el alumno tiene **2 cuotas vencidas** y el layout dice que con "2 o más cuotas vencidas el acceso está suspendido", pero entra normalmente: el bloqueo depende de `students.access_restricted`, que solo actualiza el cron `overdue-alert`. Hace falta definir con negocio si el bloqueo es automático al vencer (regla del día 10) o diferido al cron.
- **Criterio de aceptación:** mismo formato de fecha y moneda que en Pagos (`es-AR`), badge "Vencido" cuando `due_date < hoy`, y la tarjeta enlaza a `/alumno/payments`.

### QA2-015 · La evaluación docente del Profesor E2E da 404 y la lista dice "0 encuestas" aunque el alumno ya lo evaluó

- **Tipo:** Bug · **Severidad:** Alta
- **Rol y ruta:** alumno `/alumno/evaluations` → director `/director/teacher-evaluations` y `/director/teacher-evaluations/[teacherId]`
- **Pasos (solo lectura):** 1) Como alumno, "Evaluar docentes" muestra el curso E2E con el badge "Evaluado". 2) Como director, "Eval. Docentes": la fila "Profesor E2E" dice "Sin datos · 0 · 0 · —". 3) "Ver informe" → **404 "Página no encontrada"**. Los informes de los otros 2 docentes listados cargan bien.
- **Esperado vs actual:** dirección ve el promedio y la cantidad de encuestas del docente, de forma anónima. Actual: no ve la encuesta y el informe da 404, así que el flujo de punta a punta "encuesta → dirección" queda cortado. **El anonimato en la vista de dirección no se pudo verificar.**
- **Evidencia:** `evidencias/QA2-015-evaluacion-docente-profesor-e2e-404.png`.
- **Sospecha técnica:** la lista sale de `getCachedTeachers()` (`unstable_cache`) y el link usa ese `teacher.id` (`c59cb08b…`, el mismo que muestra `/director/teachers`), mientras que el detalle (`teacher-evaluations/[teacherId]/page.tsx:47`) busca el docente en Supabase en vivo y no lo encuentra. Es el mismo problema de "listas cacheadas que sirven IDs viejos después de un reseed" que documenta `qa-backlog.md` (nota de infraestructura): el `teacher_id` actual del Profesor E2E no coincide con el cacheado, por eso también da "0 encuestas". En producción pasa lo mismo ante cualquier cambio fuera de las acciones de la app (SQL directo, scripts, seed).
- **Criterio de aceptación:** las listas cacheadas tienen TTL o se revalidan cuando cambia la tabla; con el seed recién corrido, "Ver informe" del Profesor E2E muestra 1 encuesta, sin datos del alumno.

### QA2-016 · En mobile, al tomar asistencia los nombres de los alumnos quedan cortados

- **Tipo:** Mejora UX / Accesibilidad · **Severidad:** Media
- **Rol y ruta:** profesor · `/profesor/attendance/new?courseId=…` a 390x844
- **Pasos:** abrir la toma de asistencia en un celular.
- **Esperado vs actual:** el docente necesita leer el nombre completo para marcar presente o ausente. Se ve "Alumn…" y "Promo…" porque los tres botones (Presente/Ausente/Tarde) ocupan el ancho. Con nombres reales más largos, los alumnos se vuelven indistinguibles (solo queda el DNI).
- **Evidencia:** `evidencias/QA2-016-mobile-asistencia-nombres-cortados.png` (también se ve el título "Clase del 4/10/2026" con la fecha 05/10, ver QA2-012).
- **Sospecha técnica:** `src/modules/attendance/components/AttendanceTaker.tsx`, el contenedor `flex` con `truncate` en el nombre.
- **Criterio de aceptación:** a 390 px el nombre ocupa su propia línea (botones debajo) o hace wrap; no hay truncado.

## 3. Verificado y funciona bien

- Login por UI de los 4 roles `@e2e.test` y redirección al portal correspondiente.
- **Control de acceso entre portales:** alumno → `/profesor`, `/director`, `/director/students`, `/administrativo`, `/administrativo/payments` y `/profesor/courses/…` redirige a `/alumno`; profesor → `/director*`, `/administrativo*`, `/alumno` → `/profesor`; anónimo → `/login`. `/api/reports/grades` y `/api/reports/payments` → 403 para profesor y alumno, 401 para anónimo.
- **Aislamiento que sí funciona:** `/profesor/courses/<curso ajeno>` → 404; `/profesor/attendance/new?courseId=<ajeno>` → redirige a `/profesor/attendance`; `/alumno/assessments/<id>/resultado` de intentos ajenos → 404; `/alumno/evaluations/<curso ajeno>` → 404; el selector de alumnos en "Cargar nota" solo lista inscripciones de cursos propios.
- `/profesor/courses/[id]`: datos del curso, nivel traducido, cupo 2/15 con barra y alumnos inscriptos.
- `/profesor/assessments`: contadores (total, publicadas, borradores, intentos) consistentes con la tabla.
- `/profesor/notifications` y estados vacíos claros.
- Reclamo del alumno: validación inline de categoría y del mínimo de 20 caracteres, **doble clic en "Enviar reclamo" no duplica**, acentos, ñ y signos ¿¡ se guardan y se muestran bien, vuelve a "Mis reclamos" con el contador actualizado.
- Validaciones con los POST bloqueados: "Cargar nota" sin datos → "Inscripción requerida" sin llamar al servidor; perfil con nombre vacío → "El nombre debe tener al menos 2 caracteres".
- `/alumno/payments`: formato `es-AR` ($15.000, 10/10/2026), vencimiento día 10, badge "Vencido" y total pendiente; se ve bien a 390 px.
- `/alumno/grades`: nivel traducido ("Intermedio"), promedio por curso, observaciones visibles.
- `/alumno/attendance`: KPIs (total, presentes, tardanzas, ausentes) y porcentaje coherentes.
- **SCRUM-122 (badge de no leídas): RESUELTO.** La campana del alumno muestra "1" con 1 notificación sin leer, en desktop y en mobile; el profesor, sin no leídas, no muestra badge. El incremento en tiempo real no se probó porque requiere enviar una notificación.
- **E-02 (acciones huérfanas):** `markAllAsReadAction` ya tiene botón ("Marcar todas como leídas"); `createComplaintAsProfesorAction` sigue sin UI (el profesor no tiene menú de reclamos).
- Drawer y topbar mobile, tarjetas del panel alumno y tablas con columnas ocultas en mobile (Pagos oculta "Pagado").
- Después del cambio a `:5432` (DEV-047), 18 pantallas de profesor y alumno cargan en 1,5-4,5 s, incluidas `/alumno/assessments` y `/profesor/attendance/new?courseId=…`.

## No ejecutado por las restricciones (pendiente para un entorno no productivo)

- Tomar y corregir asistencia, cargar una nota (y ver el impacto en riesgo y promociones), generar y publicar una autoevaluación IA y rendirla como alumno, enviar una notificación individual a alumno@e2e.test (realtime de la campana), subir material, subir un avatar (**SCRUM-124**), cambiar el estado de un reclamo (bloqueado además por QA2-013) y enviar una encuesta docente. Todos llegaron hasta el paso previo al submit sin errores en consola, salvo lo reportado.
- **SCRUM-123** (`DATABASE_URL` de preview en el puerto 5432): fuera del alcance del navegador; queda relacionado con DEV-047 (en dev, `:6543` es el que cuelga).

## Antecedentes (campañas previas)

- **PERSISTE: BUG-E** (`qa-backlog.md`, cargado en SCRUM-234..259): warning "Received `false` for a non-boolean attribute `error`" en `/profesor/grades/new` (badge "1 Issue" del overlay de Next).
- **PERSISTE: E-01** (`hallazgos.md`): `Promise.all` con Drizzle en `profesor/attendance/new/page.tsx:42` y `alumno/assessments/[id]/page.tsx:18`, ahora con causa raíz confirmada (DEV-047 / QA2-011). La nota de `qa-backlog.md` que daba por "desactualizada" la memoria `feedback_drizzle_no_promise_all` es incorrecta.
- **PERSISTE: E-04** (`hallazgos.md`): `/api/cron/*` responde 200 a cualquier usuario, e incluso sin sesión, en development.
- **PERSISTE (nota de infraestructura de `qa-backlog.md`):** las listas con `unstable_cache` sirven IDs viejos → QA2-015.
- **SCRUM-122:** resuelto (ver la sección 3).
- **SCRUM-124:** no verificable en solo lectura; `director/users/[id]/page.tsx:73` ya renderiza `avatarUrl`, y el alumno E2E, sin avatar, muestra iniciales, como corresponde.

## Inventario de lo creado o modificado (para limpieza)

| Tabla | Registro (nombre / ID) | Acción | Rol |
|---|---|---|---|
| `complaints` | "E2E QA2 Reclamo de prueba: el proyector del aula 1 no funciona. Ñandú, acentuación áéíóú y signos ¿¡." (tipo académico, autor alumno@e2e.test, estado "open") | Creado (1 sola fila; el doble clic no duplicó) | alumno |
| — (sin datos) | `GET /api/cron/daily-report`, invocado 2 veces por error en el barrido de control de acceso (cookies de alumno y de profesor) | Respondió 200; en development `sendDailyReportEmail` solo hace `console.log`, **no se envió ningún email** | alumno, profesor |

**Verificación posterior al incidente de QA1 (pedida por la coordinación):** ningún script de QA2 operó sobre filas no E2E. Los `.first()` usados fueron: a) un clic de **navegación** (sin submit) en la primera fila de `/profesor/grades`, que solo contiene notas del curso E2E; b) la búsqueda del reclamo filtrada por el texto "E2E QA2 Reclamo" en administrativo, que no encontró filas (QA2-013) y no cambió ningún estado; c) el botón "Ausente" en la toma de asistencia del curso E2E (solo alumnos E2E), cuyo clic falló por timeout y no guardó nada (`/profesor/attendance` sigue mostrando solo la clase del seed). No hubo altas, ediciones ni borrados sobre otros registros, ni se enviaron notificaciones, emails, autoevaluaciones ni documentos.
