# Trazabilidad de requisitos: relevamiento vs. sistema construido

**Rol:** Business Analyst · **Campaña:** pulido QA oct/2026 · **Fecha:** 13/10/2026
**Commit revisado:** `5207074` (rama `main`)

Este documento cruza lo relevado con el cliente contra lo que hoy hace el código.
Cada brecha queda como un requisito accionable (`BA-NNN`, sección 7) que el PO puede
priorizar y el Dev puede tomar sin tener que volver a investigarla.

---

## 0. Método y fuentes

### 0.1 Fuentes de requisitos

| Código | Fuente | Qué aporta |
|---|---|---|
| `[REL-2025]` | Relevamiento institucional de Práctica I (oct/2025), resumido en `docs/encuentro-2-dominio.md` | 10 procesos, políticas, RF-01…RF-17 del anteproyecto |
| `[REL-2026]` | Relevamiento con la Directora (may/2026), `SCRUM-191` y sus historias hijas | **Reglas vigentes:** asistencia 70%, escala 0–100, nota mínima 70, débito/crédito con descuento/recargo, edad mínima 6 |
| `[E1]`…`[E7]` | `docs/encuentro-1..7*.md` | Lo que el equipo se comprometió a mostrar en cada encuentro |
| `[HAL]` | `docs/hallazgos.md` | Backlog de 44 hallazgos (secciones A–I) |
| `[S9]` | `docs/sprint-9-plan.md` | Tickets SCRUM-234…260 de la campaña E2E anterior |
| `[DOC]` | `CONTEXT.md`, `docs/BASE_DE_DATOS.md`, `docs/ARQUITECTURA.md`, `CLAUDE.md` | Lo que la documentación técnica afirma del sistema |

**Regla de precedencia:** cuando dos fuentes se contradicen, vale **la más reciente del
cliente** (`[REL-2026]` > `[REL-2025]`). Los documentos técnicos (`CONTEXT.md`,
`CLAUDE.md`) no son fuente de requisitos; donde contradicen al cliente se marcan como
deuda documental.

### 0.2 Cómo se verificó

1. Lectura del código: `src/modules/**`, `src/app/(dashboard)/**`, `src/proxy.ts`,
   `src/lib/drizzle/schema.ts` y las 13 migraciones.
2. Navegador (Playwright, solo lectura, scripts en el scratchpad de la sesión) con los
   usuarios `*@e2e.test`. Se leyeron `/director/promotions` y `/director/year-end`.
   **Limitación:** en el resto de las páginas con queries a la base, y en un segundo
   intento incluso en el login, el servidor no respondió en 120 s (ver `RNF-07`). Esos
   puntos quedan verificados solo contra el código.
   **Atención:** la base que usa `localhost:3000` es la de **producción** (DEV-005). La
   revisión fue estrictamente de solo lectura y en este documento no se transcribe
   ningún dato personal: las evidencias se describen anonimizadas.
3. Los `test.fail` de la suite E2E (`tests/e2e/**`) se usaron como evidencia de bugs que
   siguen abiertos: hay 7, y ninguno de los tickets del Sprint 9 figura como resuelto en
   el código.
4. **Seguridad:** está relevada en `docs/qa-2026-10/dev-auditoria-tecnica.md`. Acá no se
   duplica: donde una brecha de negocio tiene causa técnica se cita el `DEV-NNN`, y las
   historias `BA-NNN` describen el comportamiento de negocio esperado.

### 0.3 Escala de estados

| Estado | Significado |
|---|---|
| ✅ **Cumple** | Implementado y coherente con la fuente más reciente |
| 🟡 **Parcial** | Implementado, pero con huecos (falta una variante, falla en un rol, solo vive en la UI, etc.) |
| ❌ **No cumple** | Relevado y no implementado |
| ⛔ **Contradice** | Implementado con un valor o comportamiento **opuesto** a lo que pidió el cliente |

---

## 1. Resumen ejecutivo

| Tipo | Total | ✅ Cumple | 🟡 Parcial | ❌ No cumple | ⛔ Contradice |
|---|:-:|:-:|:-:|:-:|:-:|
| Funcionales (RF) | 45 | 9 (20%) | 19 (42%) | 11 (24%) | 6 (13%) |
| No funcionales (RNF) | 12 | 3 (25%) | 8 (67%) | 0 | 1 (8%) |
| **Total** | **57** | **12 (21%)** | **27 (47%)** | **11 (19%)** | **7 (12%)** |

**Lectura para el PO.** El sistema cubre casi todo el alcance relevado: 2 de cada 3
requisitos están total o parcialmente implementados, y solo el 21% cumple sin
observaciones. El problema principal no es de
alcance, es de **fidelidad a las reglas del cliente y de dónde se hacen cumplir**:

1. **Las 3 reglas académicas que la Directora cambió en mayo de 2026 siguen con el valor
   viejo** (80% / 1–10 / 7). Además, en la base `grades.score` es `numeric(4,2)`, que
   tiene como máximo 99,99, así que la escala 0–100 **no entra en la columna** sin una
   migración de tipo. Es más trabajo que "dos constantes y un Zod", como dice
   `hallazgos.md` (BA-001, BA-002).
2. **Las reglas de negocio se validan en la pantalla y no en el servidor.** Se puede
   promover sin cumplir los requisitos, reactivar una inscripción sin controlar el cupo,
   cargar notas en cursos ajenos y cobrar un pago anulado. En `/director/year-end`
   aparece un alumno **"Promovido" sin ninguna nota** (BA-003, BA-006, BA-010, BA-013).
3. **La mora escalonada (15 días → aviso, 30 → suspensión, 2 cuotas → corte) no es
   automática:** solo corre cuando alguien aprieta "Verificar mora" en Pagos. Además,
   el aviso de 15 días a Dirección **no se dispara nunca** si antes el cron le mandó el
   email al alumno, porque los dos usan el mismo campo `overdue_alert_sent_at`. Y como la
   suspensión pasa la primera cuota a `suspended`, el corte por "2 cuotas vencidas"
   **casi nunca llega a 2** (BA-007, BA-008).
4. **Las bajas físicas en cascada contradicen la trazabilidad contable:** al eliminar un
   alumno se borran sus pagos ya cobrados, que es justo lo que la anulación de pagos
   (`D-02`) se diseñó para evitar (BA-005).
5. **El alumno no puede ver su recibo ni su certificado**, aunque `[E7]` lo presenta como
   destinatario de los dos (BA-016).

---

## 2. Matriz de trazabilidad: requisitos funcionales

Columnas: **ID** propio · **Requisito** (en lenguaje del cliente) · **Fuente** ·
**Implementado en** · **Estado** · **Brecha** (con la historia `BA-NNN` que la resuelve).

### 2.1 Alumnos, docentes y cursos (datos base)

| ID | Requisito | Fuente | Implementado en | Estado | Brecha |
|---|---|---|---|:-:|---|
| RF-01 | Alta, baja, modificación y listado de alumnos, con DNI único | RF-01 anteproyecto, `[E3]` §4 | `modules/students/*`, `/director/students`, `/administrativo/students` | 🟡 | La edición de nombre y teléfono **no se guarda** (`updateStudentAction` no actualiza `profiles`, SCRUM-242). La baja es física y arrastra pagos, notas y asistencia (BA-005). Un alta sin nivel queda bloqueada sin mensaje (SCRUM-235, `test.fail` BUG-C) |
| RF-02 | Edad mínima de ingreso: 6 años cumplidos | `[REL-2026]` SCRUM-186 | `lib/validation.ts` `birthDateField(6)` usado en `students/schemas.ts` | ✅ | Implementado. Los documentos `[E3]` §5 y `[E6]` §3.4 lo siguen marcando "⚠️ pendiente", y el mensaje real ("La edad mínima permitida es 6 años") no es el documentado (BA-030) |
| RF-03 | Test de nivelación al ingresar, con registro del puntaje | `[E2]` §3.1, Proceso 1 | `students.placement_test_score`, `students/schemas.ts` (0–100) | 🟡 | El puntaje se valida pero **nunca se guarda**: las actions no leen `placementTestScore` del `formData` (SCRUM-243). No hay regla que sugiera el nivel a partir del puntaje |
| RF-04 | ABM de docentes | `[E3]` §2.2 | `modules/teachers/*`, `/director/teachers` | 🟡 | La edición de nombre no se guarda (SCRUM-242). Al borrar un docente se borran en cascada sus encuestas y observaciones de clase (`schema.ts:381,402`) (BA-005) |
| RF-05 | La Directora define la oferta: curso con nivel, días y hora, aula, cupo y docente | `[E3]` §2.2, `[E4]` §3 | `modules/courses/*`, `/director/courses` | 🟡 | **No se puede crear un curso desde el formulario** (SCRUM-236, `test.fail` BUG-D). No se puede desasignar el docente (SCRUM-252) |
| RF-06 | Cupo máximo de 15 alumnos por curso | `[REL-2025]` Proceso 1, `[E5]` R1 | `courses/schemas.ts:17-22` (máx. 15) + `validateAndCreateEnrollment` | 🟡 | Se cumple al inscribir, pero se **saltea** al reactivar una inscripción (BA-006). No hay `CHECK` en la base: un `UPDATE` directo puede dejar `max_capacity = 40` |
| RF-07 | Las 3 aulas limitan los cursos simultáneos; turnos de 8 a 13 y de 15 a 21 | `[E2]` §1 (datos del negocio) | `courses.classroom` (texto libre) | ❌ | No se valida la superposición de aula ni la franja horaria: se pueden crear dos cursos en la misma aula a la misma hora, o un curso a las 23:00 (BA-024) |

### 2.2 Inscripción y cursada

| ID | Requisito | Fuente | Implementado en | Estado | Brecha |
|---|---|---|---|:-:|---|
| RF-08 | Inscripción 100% digital con validación automática (curso existente, sin duplicado, con cupo, sin choque de horario) | `[E2]` §1.2, `[E5]` R1–R3 | `enrollments.service.ts:168` (transacción + `FOR UPDATE`) | 🟡 | No valida que el **alumno** esté `active` (se puede inscribir a un suspendido, a un egresado o a uno con acceso restringido) ni que el **curso** esté `active` (BA-012). `updateEnrollmentAction` permite pasar a mano `withdrawn→active` y `active→completed`, salteando cupo, horario y promoción (SCRUM-244, BA-006) |
| RF-09 | Lista de espera cuando el curso está lleno | `[REL-2025]` flujograma de inscripción, `[HAL]` C-01, SCRUM-233 | — | ❌ | Hoy rechaza. Pendiente de decisión del cliente (I-04) (BA-020) |
| RF-10 | Cambio de horario o grupo dentro del mismo cuatrimestre sin perder la asistencia | `[REL-2025]`, `[HAL]` C-03 | — | ❌ | Hay que dar de baja e inscribir de nuevo, y la asistencia queda en la inscripción vieja (BA-021) |
| RF-11 | Asistencia digital por clase, tomada en el aula | RF-04 anteproyecto, `[E2]` §1.2 | `attendance/actions.ts:12`, `/*/attendance/new` | 🟡 | **No está definido quién la toma** (G-06 / I-01): el sistema lo permite a los 3 roles. El docente puede tomar lista en **cursos ajenos**. Se aceptan **fechas futuras** y días en que el curso no se dicta (`test.fail` V1). `recordAttendanceSchema` existe pero no se usa (BA-011) |
| RF-12 | Corregir una asistencia ya cargada, dejando registro de quién y cuándo | `[HAL]` D-01 | `updateAttendanceAction`, `deleteAttendanceSessionAction`, migración `0012` | ✅ | — |
| RF-13 | Aviso cuando un alumno falta 2 veces seguidas | `[REL-2025]` Proceso 2, `[E5]` R8 | `attendance/actions.ts:36` → `sendToRole("director")` | 🟡 | Solo se avisa a Dirección. En el proceso relevado, el aviso era para el **tutor** y lo gestionaba la administrativa. No le llega ni a la administrativa ni al docente del curso (BA-022) |
| RF-14 | Carga de notas online por evaluación, con promedio automático | RF-05 anteproyecto, `[E2]` §1.2 | `modules/grades/*`, `/profesor/grades`, `/director/grades` | ⛔ | Escala **1–10**, cuando el cliente pidió **0–100** (BA-001). El docente puede cargar notas en cursos que no dicta (SCRUM-246, BA-010). El promedio es simple, aunque `[E2]` §4.2 dice que los tipos de evaluación "no pesan igual" (BA-023). Se aceptan notas en inscripciones `completed` o `withdrawn` |
| RF-15 | Promoción con asistencia mínima de **70%** y promedio mínimo de **70/100** | `[REL-2026]` SCRUM-190, SCRUM-188 | `promotions.service.ts:5-6` (80 / 7,0) | ⛔ | Valores viejos (80% / 7). Así se ven en `/director/promotions` ("asistencia ≥ 80% · promedio ≥ 7.0") y en `/director/year-end` ("Umbral asistencia: 80% · Umbral nota: 7") (BA-001, BA-002) |
| RF-16 | El sistema decide quién promueve: no se puede promover a quien no cumple | `[E5]` §3, decisión #1 | `promoteStudentAction` → `promoteEnrollment` | ⛔ | El servidor **no vuelve a validar** la elegibilidad (SCRUM-248). Evidencia en vivo: en `/director/year-end` figura una inscripción con 100% de asistencia, promedio "—" y resultado **Promovido**, es decir, promovida sin ninguna nota (datos anonimizados; BA-003, DEV-036) |
| RF-17 | Certificado de promoción para el alumno | `[REL-2025]` Proceso 7, `[E7]` §2.4 ("Dirección / Alumno") | `/director/promotions/[id]/certificate` | 🟡 | Solo lo ve Dirección: el layout de `/director` redirige al alumno, y `/alumno` no tiene ni ruta ni enlace al certificado (BA-016) |
| RF-18 | El alumno que no promueve puede recursar el nivel con descuento | `[REL-2025]`, `[HAL]` C-02 | — | ❌ | La inscripción queda `active` para siempre; no hay registro del recursado ni del descuento (BA-021) |
| RF-19 | Cierre de ciclo: consolidar promociones en lote y graduar al alumno sin cursos pendientes | `[E5]` §3, decisión #2 | `year-end.service.ts:130`, `/director/year-end` | 🟡 | No existe la entidad **ciclo/cuatrimestre**: el cierre evalúa todas las inscripciones históricas. "Egresado" se marca al completar **cualquier** curso si no queda otro pendiente (un alumno de Principiante queda egresado), y una inscripción `withdrawn` **impide** egresar. Los "insuficientes" quedan `active` (BA-014) |

### 2.3 Cobranza

| ID | Requisito | Fuente | Implementado en | Estado | Brecha |
|---|---|---|---|:-:|---|
| RF-20 | Registrar el cobro y emitir un recibo digital | RF-06/07 anteproyecto, `[E7]` §2.5 | `markAsPaidAction`, `/director/payments/[id]/receipt` | 🟡 | `markAsPaid` no controla el estado: **cobra un pago anulado** y lo "resucita" (SCRUM-249, BA-013). El recibo del portal `administrativo` enlaza a `/director/...` (E-03). El **alumno no puede ver ni descargar su recibo** (BA-016) |
| RF-21 | La cuota vence el día 10 de cada mes | `[REL-2025]` + `[REL-2026]` | `PaymentForm.tsx:26` (valor por defecto) | 🟡 | El 10 es solo el valor sugerido del formulario; el servidor acepta cualquier día (BA-017) |
| RF-22 | Generar la cuota mensual de cada alumno | `[E5]` BPMN ("Generar cuota mensual"), `[E2]` §3.2 | `createPaymentAction` (alta manual, de a una) | ❌ | No hay generación periódica: la administrativa da de alta cada cuota a mano, y la cuota no está asociada al curso (BA-018) |
| RF-23 | Métodos de pago: efectivo, transferencia, **débito y crédito**, con descuento por efectivo y por transferencia/débito y **recargo por crédito** | `[REL-2026]` SCRUM-180, `[HAL]` B-04 | enum `payment_method` = `cash, transfer, card` | ⛔ | "Tarjeta" no distingue débito de crédito, y no existe ningún cálculo de descuento o recargo. Faltan los porcentajes (I-02) (BA-004) |
| RF-24 | Matrícula al inscribir + cuota mensual por curso | `[REL-2025]`, `[HAL]` C-05, SCRUM-179/181 | — | ❌ | `payments` no tiene concepto (matrícula o cuota) ni vínculo con el curso, y `courses` no tiene precio (BA-018) |
| RF-25 | Descuento por pagar el cuatrimestre completo por adelantado | `[HAL]` C-04, SCRUM-183 | — | ❌ | Pasa a Práctica III según `[E7]` §4.3 |
| RF-26 | Facturación electrónica ARCA para los pagos que no son en efectivo | `[REL-2026]` SCRUM-184 | — | ❌ | Ampliación de alcance (estaba fuera del anteproyecto); pasa a Práctica III |
| RF-27 | Mora: vencida → a los 15 días aviso a Dirección → a los 30 días suspensión del alumno | `[REL-2025]` Políticas de Pago, `[E5]` R6 | `runOverdueChecksAction` (`payments/actions.ts:184`) | 🟡 | **No es automático:** ningún cron llama a `markOverduePayments` ni a la suspensión; solo corre con el botón "Verificar mora". El aviso de 15 días comparte `overdue_alert_sent_at` con el email del cron, así que **no se dispara** si el cron ya le avisó al alumno (BA-007) |
| RF-28 | Con 2 cuotas vencidas se corta el acceso al portal del alumno | `[E5]` R7 | `cron/overdue-alert/route.ts:42`, `automations/actions.ts:78`, `alumno/layout.tsx` | 🟡 | Solo cuenta pagos `overdue`. La suspensión de los 30 días pasa la primera cuota a `suspended`, así que en el caso típico (2 meses sin pagar) **el contador nunca llega a 2**. Al regularizar, el acceso no se restituye solo (BA-008) |
| RF-29 | El alumno suspendido que regulariza vuelve a estar activo | `[E6]` CB7, I-06 | — | ❌ | Al cobrar no se revierten ni el estado del alumno (`suspended`) ni `access_restricted`. Pendiente de decisión del cliente (BA-009) |
| RF-30 | Anular un pago con motivo, sin borrarlo | `[HAL]` D-02 | `cancelPaymentAction`, migración `0013` | ✅ | — |
| RF-31 | Editar un pago solo mientras no esté cobrado | `[E6]` CB3 | `updatePayment` (`where status in (pending, overdue)`) | ✅ | — |

### 2.4 Seguimiento, comunicación y evaluación docente

| ID | Requisito | Fuente | Implementado en | Estado | Brecha |
|---|---|---|---|:-:|---|
| RF-32 | Detectar a tiempo a los alumnos en riesgo de abandono | RF-16 anteproyecto, `[E5]` decisión #7 | `risk-detection.service.ts`, cron 09:00, `/director/risk` | 🟡 | Funciona como se diseñó, pero: la señal de pagos solo cuenta `overdue` (no `suspended`, que es el caso más grave); la de rendimiento usa **autoevaluaciones IA** y no las notas; y el umbral de asistencia (<70%) coincide con el nuevo mínimo de promoción, así que la alerta llega cuando el alumno ya no promueve (BA-019) |
| RF-33 | Avisar al docente y a Dirección cuando un alumno se acerca al mínimo de asistencia | `[E2]` §3.3 | `attendance.service.ts:224` (`LOW_ATTENDANCE_THRESHOLD = 70`), `lib/email.ts:259,511` | ⛔ | La alerta salta al bajar del 70%, pero el email dice "se requiere un mínimo de **80%**". Con la regla nueva (70%) el aviso llega tarde: el alumno ya quedó afuera (BA-019) |
| RF-34 | Canal institucional de comunicación con registro (notificaciones internas + email) | `[REL-2025]`, problema del "WhatsApp personal" | `modules/notifications/*`, Resend | ✅ | El indicador de no leídas sigue pendiente (SCRUM-122), y `markAllAsReadAction` no tiene UI (E-02) |
| RF-35 | Portal y avisos para el tutor del alumno menor | RF-14 anteproyecto, RF-08/09 | — | ❌ | Reducción de alcance documentada (F-08); pasa a Práctica III. El modelo ni siquiera guarda el email del tutor |
| RF-36 | Reclamos: el alumno los presenta y Administración o Dirección los resuelve | `[REL-2025]` "cuaderno de reclamos", `[E3]` UC13 | `modules/complaints/*`, `/alumno/complaints` | 🟡 | `/alumno/complaints` existe pero **no figura en el menú del alumno** (`Sidebar.tsx:92-102`): solo se llega escribiendo la URL. `createComplaintAsProfesorAction` no tiene UI (E-02) (BA-015) |
| RF-37 | Encuesta digital **anónima** del docente, con comparativa | `[REL-2025]`, `[E3]` nota 6 | `teacher_surveys`, `/alumno/evaluations`, `/director/teacher-evaluations` | ⛔ | Se guarda `enrollment_id`, que identifica al alumno: la encuesta **no es anónima** (SCRUM-250). Contradice la justificación de `[HAL]` D-08 (BA-025) |
| RF-38 | Observaciones de clase de Dirección (2 por docente por cuatrimestre) | `[REL-2025]`, `[E2]` §4.3 | `createObservationAction` | 🟡 | Sin modificación ni baja (D-05) y sin indicador de cumplimiento del objetivo de 2 por cuatrimestre (BA-026) |
| RF-39 | Autoevaluación diagnóstica generada con IA cada N clases | Anteproyecto, `[E5]` decisión #9 | `auto-assessment.service.ts`, `courses.diagnostic_frequency` | ✅ | — |
| RF-40 | Material de estudio por curso | `[REL-2026]` SCRUM-189 | `modules/documents/*` (10 MB, tipos permitidos) | ✅ | El docente puede subir material pero no borrar el suyo (`deleteDocumentAction` es solo `director`); a revisar con el cliente |
| RF-41 | Marketing: campañas y consultas de aspirantes | `[REL-2025]` Proceso 9 | `modules/marketing/*` | 🟡 | ABM incompleto (D-03/D-04) y decisión pendiente del cliente de eliminar el módulo (SCRUM-187, I-09) |
| RF-42 | Chatbot de práctica "SmartEnglish" | RF-17 anteproyecto | — | ❌ | Pasa a Práctica III (F-07) |

### 2.5 Salidas, acceso y gestión

| ID | Requisito | Fuente | Implementado en | Estado | Brecha |
|---|---|---|---|:-:|---|
| RF-43 | Reportes Excel de asistencia, notas y pagos | `[E7]` §2.1–2.3, RF-12 | `app/api/reports/*` | 🟡 | `/administrativo/reports` muestra los 3 botones, pero la API le responde **403** a ese rol (SCRUM-245, `test.fail`; decisión I-08). El de notas dice "Nota (1-10)" y calcula "Aprobado" con nota ≥ 7 (BA-001). No hay totales diarios por método de pago en pantalla (SCRUM-185) |
| RF-44 | Dashboard y reporte diario con información en tiempo real para Dirección | RF-10 anteproyecto, `[E7]` §2.6 | `/director`, cron `daily-report` | ✅ | — |
| RF-45 | Login, invitación por email y recuperación de contraseña; 4 portales según el rol; Dirección gestiona usuarios (alta, ban/unban, reenvío) | `[E4]` §4, SCRUM-170 | `(auth)/*`, `proxy.ts`, `modules/users/*` | ✅ | Riesgo abierto: el director puede bloquearse o degradarse a sí mismo y dejar el instituto sin director (SCRUM-247, tratado en RNF-03 / BA-027). El historial unificado del alumno (`[E2]` §1.2) muestra inscripciones y pagos, pero no notas ni asistencia (BA-028) |

> **Nota de conteo.** Los requisitos que la documentación ya pasó a Práctica III (RF-25,
> RF-26, RF-35, RF-42) cuentan como ❌: es la cifra honesta para el coloquio. Sin ellos,
> el cumplimiento total o parcial de lo comprometido para Práctica II sube de 62% a 68%.
> Las causas técnicas de varias brechas están en la auditoría Dev: RF-01/04 → DEV-017,
> DEV-018, DEV-019 · RF-08 → DEV-020, DEV-021 · RF-11 → DEV-011, DEV-037 · RF-14 →
> DEV-010 · RF-16 → DEV-036 · RF-20 → DEV-029, DEV-030 · RF-27/28 → DEV-025, DEV-026,
> DEV-031 · RF-37 → DEV-003, DEV-012 · RF-43 → DEV-024 · RF-45 → DEV-023.

---

## 3. Matriz de trazabilidad: requisitos no funcionales

| ID | Requisito | Fuente | Implementado en | Estado | Brecha |
|---|---|---|---|:-:|---|
| RNF-01 | Toda la interfaz en español rioplatense | `[E6]` §3 ("en español, orientado al usuario"), `CLAUDE.md` | Textos de UI y mensajes Zod | 🟡 | Quedan términos en inglés: "Dashboard" (menú de director y administrativo), "Quiz" (tipo de evaluación). `createGradeAction` devuelve `error.message` crudo de Supabase, que llega en inglés (BA-029) |
| RNF-02 | Marca "Smart Learning"; la app no menciona "IICANA" | `CLAUDE.md` | `src/**` no contiene "IICANA" | ✅ | En la documentación sí: `presentacion-completa.md` y `encuentro-1` titulan "IICANA Smart Learning". Como nombre del cliente está bien; como nombre del producto, no (BA-031) |
| RNF-03 | Cada permiso se justifica desde el negocio y se hace cumplir en el servidor, no solo escondiendo botones | `[E4]` §3 y §3.1 | `proxy.ts`, `requireRole` | 🟡 | El chequeo de **rol** existe, pero falta el de **pertenencia** (docente ↔ su curso, alumno ↔ su inscripción) y hay escaladas de privilegio. Detalle técnico en DEV-001…004, DEV-010…015, DEV-023. Visto desde el negocio: BA-010, BA-011, BA-027 |
| RNF-04 | Integridad: las reglas de negocio no se pueden saltear (concurrencia, estados válidos) | `[E6]` §5 | `FOR UPDATE`, índices únicos `0010`/`0011` | 🟡 | La concurrencia está bien resuelta. Lo que falla es la **máquina de estados**: inscripciones, pagos y promociones aceptan transiciones que los diagramas de `[E6]` §1 no permiten (BA-003, BA-006, BA-013; DEV-020, DEV-030, DEV-036) |
| RNF-05 | Trazabilidad: quién cambió qué y cuándo en los datos que impactan la promoción y la cobranza | `[E3]` nota 1 y 2, `[E6]` §4 (la contadora audita) | `attendance.updated_by`, `payments.cancelled_by` | 🟡 | Solo están auditadas la corrección de asistencia y la anulación de pagos. **Notas, inscripciones (cambio de estado), promociones manuales y bajas** no dejan rastro, y las bajas físicas borran el historial (BA-005, DEV-019) |
| RNF-06 | Responsive: tablas con scroll, columnas secundarias ocultas en mobile | `CLAUDE.md` | Convención aplicada en las listas | ✅ | No se volvió a verificar en esta revisión (el servidor no respondía) |
| RNF-07 | Tiempo de respuesta aceptable para operar en mostrador y en el aula | `[E2]` §1.2 (inscripción "~15 min" → "100% digital"); guía de RNF del coloquio | Drizzle `max: 1` (`lib/drizzle/index.ts:7`), región `iad1` | 🟡 | Durante esta revisión, `/director/payments`, `/director/grades/new`, `/director/reports` y `/profesor/grades` no respondieron en 120 s y después ni el login completaba (con los QA trabajando en paralelo). Con 1 sola conexión y 3 administrativas + docentes en simultáneo, el riesgo operativo es real. Causas en DEV-006 y DEV-042 (BA-032) |
| RNF-08 | El sistema explica por qué rechaza una operación | `[E6]` §3 | Mensajes Zod y de services | 🟡 | La mayoría está bien. Fallan en silencio o con pantalla de error: alta de alumno sin nivel (SCRUM-235), reactivar inscripción duplicada (DEV-020), excepción de `requireRole` sin `error.tsx` (DEV-022), edición de alumno que informa éxito y no guarda (DEV-017) |
| RNF-09 | Lenguaje del dominio consistente entre pantallas (niveles, estados, umbrales) | `CLAUDE.md` (`LEVEL_LABELS`), `[E5]` §1 | `lib/level-labels.ts` | 🟡 | 12 archivos tienen su propio mapa de niveles, con 4 variantes de "upper_intermediate" ("Intermedio Alto", "Upper-intermedio", "Upper-inter.", "Upper."). Los umbrales están escritos a mano en más de 15 lugares (sección 4.2) (BA-029) |
| RNF-10 | Las decisiones automáticas corren solas, sin que nadie las dispare | `[E5]` §3 ("el sistema decide sin que nadie se lo pida") | 5 crons en `vercel.json` | 🟡 | Mora a `overdue`, aviso de 15 días y suspensión de 30 días **no tienen cron**; dependen del botón "Verificar mora" (DEV-025) (BA-007) |
| RNF-11 | Calidad verificable: typecheck, tests y CI | `[E4]` §4.1, `[E7]` §6 | `pnpm tsc`, 159 tests unitarios, 162 E2E, GitHub Actions | ✅ | Hay 7 `test.fail` que documentan bugs vigentes |
| RNF-12 | Confidencialidad: la encuesta docente es anónima y los datos de cada alumno solo los ve quien corresponde | `[E3]` nota 6, `[HAL]` D-08 | `teacher_surveys.enrollment_id`, policies RLS | ⛔ | La encuesta guarda `enrollment_id` y las policies de lectura son `USING (true)`: cualquier usuario autenticado puede saber quién evaluó a quién (DEV-003, DEV-012) (BA-025) |

---

## 4. Reglas de negocio: relevamiento vs. código

### 4.1 Tabla de reglas

"Valor vigente" = el del relevamiento más reciente. "Valor en el código" = lo que se
ejecuta hoy. **DB** = constraint en la base (`schema.ts` + migraciones), **Zod** =
validación de servidor, **UI** = solo en pantalla.

| # | Regla | Valor vigente (fuente) | Valor en el código (dónde) | Capa que la hace cumplir | ¿Coincide? |
|---|---|---|---|---|:-:|
| R-01 | Cupo máximo por curso | 15 `[REL-2025]` | 15: `courses/schemas.ts:21` (Zod máx. 15), `schema.ts:200` (default 15), `enrollments.service.ts:209` | Zod + transacción. **DB: sin CHECK** | 🟡 Se saltea al reactivar (DEV-020) |
| R-02 | Un alumno no se inscribe dos veces al mismo curso | Sí `[E5]` R2 | Índice único parcial `0011` + chequeo previo | DB + service | ✅ (reactivar → error 500, DEV-020) |
| R-03 | No inscribir en cursos que se pisan de horario | Sí `[E5]` R3 | `schedulesOverlap` sobre el texto de `courses.schedule` | Service | 🟡 Si el texto no se puede parsear, devuelve "sin choque" (falla abierta). No usa los campos estructurados `class_days`/`class_time` |
| R-04 | Edad mínima de ingreso | 6 años `[REL-2026]` SCRUM-186 | `birthDateField(6)` | Zod (alta y edición) | ✅ |
| R-05 | Asistencia mínima para promover | **70%** `[REL-2026]` SCRUM-190 | **80**: `promotions.service.ts:5` (`ATTENDANCE_THRESHOLD`), reusado en `year-end.service.ts`, `/director/promotions`, `/director/year-end` | Service (no se revalida al promover: DEV-036) | ⛔ |
| R-06 | Cómo se cuenta la asistencia | No relevado | `(presente + tarde) / total`, redondeado a entero **antes** de comparar | Service y páginas (4 implementaciones, DEV-033) | 🟡 79,5% se redondea a 80% y promueve (DEV-034). ¿La tardanza cuenta como presente? **Preguntar al cliente** |
| R-07 | Escala de calificación | **0–100** `[REL-2026]` SCRUM-188 | **1–10**: `grades/schemas.ts:8-9`, `grades.score numeric(4,2)` (máx. 99,99) | Zod + DB | ⛔ La columna no admite 100 |
| R-08 | Nota mínima para promover | **70/100** `[REL-2026]` | **7,0**: `promotions.service.ts:6` | Service | ⛔ |
| R-09 | Cálculo del promedio | Ponderado por tipo de evaluación ("no todas pesan igual", `[E2]` §4.2); pesos no relevados | Promedio simple de todas las notas | Service y páginas | ⛔ **Preguntar los pesos al cliente** |
| R-10 | Vencimiento de la cuota | Día 10 de cada mes `[REL-2025]` y `[REL-2026]` | Valor por defecto del formulario (`PaymentForm.tsx:26`); el server acepta cualquier fecha hasta 2 años adelante | UI | 🟡 |
| R-11 | Aviso por mora | 15 días `[REL-2025]` | `dueDate < hoy − 15` (`payments.service.ts:194`) | Service, **solo con botón manual** | 🟡 Sin cron (DEV-025) y bloqueado por el campo compartido (DEV-026) |
| R-12 | Suspensión por mora | 30 días → baja temporal hasta regularizar `[REL-2025]` | `dueDate < hoy − 30` → pago y alumno `suspended` (`payments.service.ts:227-255`) | Service, **solo con botón manual** | 🟡 No se revierte al pagar (I-06), y el pago `suspended` no se puede cobrar (DEV-029) |
| R-13 | Corte de acceso al portal | 2 cuotas vencidas `[E5]` R7 | `count(status = 'overdue') >= 2` (`cron/overdue-alert/route.ts:42`, `automations/actions.ts:78`) | Cron + manual | 🟡 No cuenta las `suspended`; no se levanta al pagar (DEV-031) |
| R-14 | Recordatorio previo al vencimiento | No relevado como cifra | 3 días antes, cron 12:00 UTC (`cron.service.ts:122`) | Cron | ✅ (validar el plazo con el cliente) |
| R-15 | Métodos de pago | Efectivo, transferencia, débito, crédito `[REL-2026]` | `cash`, `transfer`, `card` (`schema.ts:58`) | DB enum + Zod | ⛔ |
| R-16 | Descuentos y recargos según método | Descuento efectivo; descuento transferencia/débito; **recargo** crédito; % a definir (I-02) | No existe | — | ❌ |
| R-17 | No se aceptan cheques | `[REL-2025]` | El enum no lo incluye | DB enum | ✅ |
| R-18 | Matrícula anual + cuota mensual por curso | `[REL-2025]` | No existe (pago genérico sin concepto) | — | ❌ |
| R-19 | Recursar con descuento | `[REL-2025]` | No existe | — | ❌ |
| R-20 | Descuento por adelantar el cuatrimestre | `[REL-2025]` SCRUM-183 | No existe | — | ❌ |
| R-21 | Requisitos de promoción | Asistencia **y** nota mínimas, con inscripción activa | `isEligible` en 4 lugares; `promoteEnrollment` no lo verifica; `updateEnrollmentAction` permite `completed` a mano | UI | ⛔ (DEV-036) |
| R-22 | Egreso (graduación) | "Sin cursos pendientes" `[E5]` BPMN | Todas las inscripciones del alumno `completed` (una `withdrawn` lo impide) | Service | 🟡 Definición ambigua: hoy egresa quien termina cualquier nivel. **Preguntar si egresa al completar Avanzado** |
| R-23 | Alerta por ausencias | 2 consecutivas `[REL-2025]` Proceso 2 | 2 consecutivas → notificación a Dirección (`attendance/actions.ts:36`) | Service | 🟡 Destinatario distinto del relevado (tutor/administrativa) |
| R-24 | Alerta de asistencia crítica | "Baja del 70%" `[E2]` §3.3 (definido con la regla vieja del 80%) | Cruce de 70% (`attendance.service.ts:224`); el email dice "mínimo 80%" (`email.ts:259,511`) | Service | ⛔ Con mínimo 70%, el aviso tiene que saltar **antes** (propuesta: 80%) |
| R-25 | Riesgo de abandono | Cruce de mora + asistencia + rendimiento `[E5]` #7 | 0 señales = none, 1 = low, 2 = medium, 3 = high; asistencia < 70%, autoevaluaciones < 60%, pagos `overdue` | Cron | 🟡 Umbrales de la regla vieja; no cuenta `suspended`; la intervención se pierde (DEV-038) |
| R-26 | Anulación de pago | Con motivo, sin borrar `[HAL]` D-02 | Motivo de 10 a 500 caracteres | Zod + service | ✅ |
| R-27 | Editar un pago | Solo si no está cobrado `[E6]` CB3 | `where status in (pending, overdue)` | Service | ✅ |
| R-28 | Reclamo | Descripción mínima | 20 a 1000 caracteres | Zod | ✅ |
| R-29 | Material | 10 MB; PDF, Word, imágenes, texto | `documents/actions.ts:15-35` | Service | 🟡 El tipo lo declara el navegador (DEV-040) |
| R-30 | Encuesta docente | Anónima, 1 por alumno y curso | Chequeo "Ya enviaste…" + `enrollment_id` guardado | Service | ⛔ No es anónima; no hay índice único (DEV-012) |
| R-31 | Observaciones de clase | 2 por docente por cuatrimestre `[REL-2025]` | Sin control | — | ❌ |
| R-32 | Franja horaria y aulas | 8–13 y 15–21 h; 3 aulas `[REL-2025]` | Duración 15–240 min; hora libre; aula en texto libre | Zod | ❌ |
| R-33 | Bloqueo de usuario | Dirección da de baja el acceso | `ban_duration: "87600h"` (10 años) (`users.service.ts:81`) | Supabase Auth | 🟡 El director se puede bloquear a sí mismo (DEV-023) |
| R-34 | Autoevaluación IA | Cada N clases del curso | `diagnostic_frequency` 0–20 (0 = apagada) | Zod | ✅ |

**Resumen de reglas:** 34 reglas · ✅ 8 · 🟡 12 · ❌ 6 · ⛔ 8 (contando como ⛔ las que
contradicen el valor del cliente y las que la UI muestra pero el servidor no aplica).

### 4.2 Inconsistencias entre pantallas

La misma regla se ve distinta según dónde se mire. Es lo primero que nota un docente que
recorre la app en vivo.

| # | Regla | Pantalla A | Pantalla B | Problema |
|---|---|---|---|---|
| I-01 | Escala de notas | Autoevaluaciones y test de nivel: **0–100** (`schema.ts:344`, `students/schemas.ts`) | Notas: **1–10** (`GradeForm.tsx:101` "Nota (1–10)", notificación "x/10", email "/10", Excel "Nota (1-10)") | Dos escalas en el mismo sistema para el mismo alumno |
| I-02 | Umbral de asistencia | Promociones y Cierre de ciclo: **80%** | Alerta al docente, riesgo y reporte diario: **70%** | Dirección ve "en riesgo" en un lado y "no promueve" en otro con cortes distintos |
| I-03 | Mínimo informado al alumno o docente | Email de alerta: "mínimo **80%** para promocionar" (`email.ts:259,511`) | Regla vigente: 70% | El sistema le comunica al alumno una regla que ya no existe |
| I-04 | Color de asistencia | Barras en `/director`, `/administrativo`, `/profesor/attendance`, `AttendanceChart`: verde ≥ **80**, ámbar ≥ 60 | Regla vigente: 70% | Un alumno con 75% (promueve) se pinta en ámbar |
| I-05 | "Aprobado" en notas | `reports.service.ts:82`, `api/reports/grades` (≥ 7), `/director/reports` y `/administrativo/reports` (≥ 7), `GradesChart` (≥ 7), `GradeList` (verde ≥ 7, ámbar ≥ 5) | Regla vigente: 70/100 | Siete lugares a actualizar; si se cambia solo la constante, los reportes siguen con 7 |
| I-06 | Elegibilidad para promover | `/director/promotions` (cálculo propio en la página) | `promotions.service.ts`, `/director/year-end` (cálculo propio) y `year-end.service.ts` | 4 implementaciones de la misma regla; las páginas usan PostgREST con corte en 1000 filas (DEV-033) |
| I-07 | Inscripción sin notas | `/director/promotions`: "No cumple requisitos" | `/director/year-end`: "Insuficiente" (si tiene asistencia) o "Sin datos" (si no tiene nada) | Tres nombres para casos parecidos |
| I-08 | Nivel "upper_intermediate" | `LEVEL_LABELS`: "Intermedio Alto" | Detalles de curso, alumno e inscripción: "Upper-intermedio"; gráficos: "Upper-inter." / "Upper." | 12 archivos con mapas propios |
| I-09 | Nombre del módulo de mensajes | Director/administrativo: "Comunicaciones" | Profesor/alumno: "Mensajes"; configuración: "Notificaciones" | Tres nombres para la misma función |
| I-10 | Resultado de la inscripción | Estado `completed` = "Completado" | Cierre de ciclo: "Promovido"; menú: "Promociones"; textos: "promocionar" / "promover" | Elegir un término (propuesta: **Promovido / promover**) |
| I-11 | Egreso | Estado del alumno: "Egresado" | `[E5]`/`[E6]`: "graduado"; acción: "marcado(s) como egresado(s)" | Unificar a **Egresado** también en la documentación |

---

## 5. Casos borde (`encuentro-6-casos-borde.md`) verificados contra el código

### 5.1 Casos borde declarados (CB1–CB9)

| # | Caso | Lo que dice `[E6]` | Lo que hace el código | Veredicto |
|---|---|---|---|:-:|
| CB1 | Corregir una asistencia ya cargada | Permite corregir y deja traza | `updateAttendanceAction` → `updated_at` / `updated_by` (migración `0012`). No vuelve a disparar alertas (decisión documentada en el código) | ✅ |
| CB2 | Clase cargada en el curso equivocado | Permite eliminar la sesión completa | `deleteAttendanceSessionAction`. Es una baja física **sin traza** de quién la borró. El docente puede borrar sesiones de cursos ajenos (DEV-011) | 🟡 |
| CB3 | Pago con monto equivocado | Editable solo si no está cobrado | `updatePayment` filtra `status in (pending, overdue)` | ✅ |
| CB4 | Anular un pago | `cancelled` con motivo, sin borrar | Correcto, pero `markAsPaid` **cobra un pago anulado** y lo saca de `cancelled` (DEV-030), y `deleteStudent` borra el pago anulado junto con el alumno (DEV-019) | 🟡 |
| CB5 | Doble submit de la asistencia | `onConflictDoNothing` + constraint único | Confirmado (`attendance.service.ts:316-328`, migración `0010`). Las alertas e IA se pueden disparar dos veces (DEV-037) | ✅ |
| CB6 | Dos inscripciones concurrentes al último cupo | `SELECT FOR UPDATE` + índice único | Confirmado en `validateAndCreateEnrollment`. **Pero** el camino alternativo `updateEnrollmentAction` (reactivar) no pasa por ahí (DEV-020) | 🟡 |
| CB7 | Regularizar una cuota vencida | `overdue → paid`; el alumno suspendido "debería reactivarse" | Al cobrar no se revierte ni `students.status = suspended` ni `access_restricted`. Un pago ya `suspended` directamente no se puede cobrar (DEV-029, DEV-031). Decisión del cliente pendiente (I-06) | ❌ |
| CB8 | Alumno sin datos de asistencia al cierre | Se clasifica `no_data` y no se promueve | Solo si **no tiene ni asistencia ni notas**. Con asistencia y sin notas sale "Insuficiente" (no promueve, correcto). Pero `promoteStudentAction` lo puede promover igual a mano (DEV-036), y así se observó en `/director/year-end` (caso anonimizado) | 🟡 |
| CB9 | Curso lleno (15) | Hoy rechaza; el negocio pide lista de espera | Rechaza con "El curso alcanzó el cupo máximo de N alumnos" | 🟡 (rechazo ✅, lista de espera ❌ BA-020) |

### 5.2 Lista de excepciones (`[E6]` §3): mensaje documentado vs. real

| Rechazo | Mensaje documentado | Mensaje real / comportamiento | Veredicto |
|---|---|---|:-:|
| Curso inexistente | "Curso no encontrado" | Igual | ✅ |
| Duplicado activo | "El alumno ya está inscripto en este curso" | Igual al crear. Al **reactivar**, error 500 sin mensaje (DEV-020) | 🟡 |
| Cupo lleno | "…cupo máximo de 15 alumnos" | "…cupo máximo de ${maxCapacity} alumnos" (correcto, el cupo puede ser menor) | ✅ |
| Choque de horario | "El horario se superpone con el curso «…»" | Igual (con comillas rectas) | ✅ |
| Asistencia duplicada | "La asistencia de esta fecha ya fue registrada" | Igual | ✅ |
| Nota fuera de rango | "La nota mínima es 1" / "La nota máxima es 10" | Igual, **pero contradice la escala vigente** 0–100 | ⛔ |
| Monto ≤ 0 | "El monto debe ser mayor a 0" | Igual | ✅ |
| Recibo duplicado | "Ya existe un pago con ese número de recibo" | Igual (`payments/actions.ts:78`, sobre el unique de `receipt_number`) | ✅ |
| Fecha inválida | "Ingresá una fecha válida" | Igual | ✅ |
| Anulación sin motivo | "…mínimo 10 caracteres" | Igual | ✅ |
| Editar pago cobrado | "Solo se puede editar un pago pendiente o vencido…" | Igual | ✅ |
| DNI duplicado | "Ya existe un alumno registrado con ese DNI" | Igual al crear; al editar, "Ya existe **otro** alumno…" | ✅ |
| Email duplicado | "Ya existe un usuario con ese email" | Igual | ✅ |
| Edad < 6 | "El alumno debe tener al menos 6 años de edad" (⚠️ pendiente) | **Implementado**, con el texto "La edad mínima permitida es 6 años" | 🟡 doc desactualizada (BA-030) |
| Archivo > 10 MB | "El archivo no puede superar los 10 MB" | Igual | ✅ |
| Formato no permitido | "Formato no permitido…" | Igual (validado contra el MIME que declara el navegador, DEV-040) | ✅ |
| Reclamo corto | Mínimo 20 caracteres | Igual | ✅ |
| Evaluación docente duplicada | "Ya enviaste tu evaluación para este curso" | Igual, pero se puede saltear (DEV-012) | 🟡 |

### 5.3 Casos borde nuevos (no figuran en `[E6]`)

Salen de recorrer los diagramas de estado de `[E6]` §1 buscando transiciones que el
código permite y el diagrama no.

| # | Caso borde | Qué pasa hoy | Qué debería pasar (según el negocio) | Historia |
|---|---|---|---|---|
| CB10 | Inscribir a un alumno `suspended`, `graduated` o con acceso restringido | Se inscribe sin aviso | Rechazar (suspendido/restringido) o pedir confirmación (egresado que vuelve) | BA-012 |
| CB11 | Inscribir en un curso `inactive` o `completed` | Se inscribe | Rechazar: "El curso no está abierto a inscripciones" | BA-012 |
| CB12 | Pasar una inscripción de `withdrawn` a `active` con el curso lleno | Se reactiva y el curso queda con 16 | Validar cupo y horario como una inscripción nueva | BA-006 |
| CB13 | Pasar a mano una inscripción a `completed` desde Inscripciones | Queda "Promovido" sin cumplir los requisitos | Solo se completa por promoción, con validación | BA-003 |
| CB14 | Tomar asistencia de una fecha futura o de un día sin clase | Se acepta (`test.fail` V1) | Rechazar fechas futuras; advertir si el curso no se dicta ese día | BA-011 |
| CB15 | Cargar una nota en una inscripción dada de baja o ya promovida | Se acepta y cambia el promedio histórico | Rechazar, o exigir un motivo | BA-010 |
| CB16 | Dos meses sin pagar, con la verificación de mora ejecutada | La 1ª cuota pasa a `suspended`, la 2ª queda `overdue`: el contador da 1 y **no se corta el acceso** | Cortar el acceso con 2 cuotas impagas, en cualquier estado de mora | BA-008 |
| CB17 | El cron le avisa al alumno de la cuota vencida antes de que pasen 15 días | `overdue_alert_sent_at` queda seteado y el aviso a Dirección de los 15 días **nunca sale** | Dos marcas independientes | BA-007 |
| CB18 | Eliminar un alumno que tiene pagos cobrados | Se borran los pagos (cascada) y su cuenta sigue habilitada (DEV-019) | Baja lógica (`inactive`); los pagos se conservan | BA-005 |
| CB19 | Eliminar un curso con historia | Se borran inscripciones, asistencia, notas, encuestas y autoevaluaciones | Impedir la baja si tiene inscripciones; ofrecer "cerrar curso" (`completed`) | BA-005 |
| CB20 | Un alumno cursa Principiante, promueve y no tiene otra inscripción | Al cerrar el ciclo queda **Egresado** | Egresa solo al completar el último nivel (a confirmar) | BA-014 |
| CB21 | Alumno con una inscripción dada de baja y las demás completas | **Nunca egresa** (la `withdrawn` cuenta como pendiente) | Ignorar las bajas al evaluar el egreso | BA-014 |
| CB22 | Asistencia de 79,5% o promedio de 6,95 | Redondea y promueve (DEV-034) | Comparar sin redondear, o definir el redondeo con el cliente | BA-002 |
| CB23 | La cuota se carga con vencimiento día 25 | Se acepta | Rechazar o pedir confirmación si no es día 10 | BA-017 |
| CB24 | Dos cursos en la misma aula a la misma hora | Se acepta | Rechazar: "El aula 2 ya está ocupada por «…»" | BA-024 |

---

## 6. Coherencia del lenguaje del dominio

| Aspecto | Estado | Detalle |
|---|:-:|---|
| Todo en español | 🟡 | "Dashboard" en el menú de director y administrativo (`Sidebar.tsx:47,72`); "Quiz" como tipo de evaluación (`GradeForm.tsx:38` y 4 mapas más); errores de Supabase sin traducir en `createGradeAction` |
| Sin "IICANA" en la app | ✅ | `src/` y `public/` limpios. En `docs/` el producto figura como "IICANA Smart Learning" (`presentacion-completa.md:1`, `encuentro-1-informativo.md` §1): corregir a "Smart Learning" y nombrar a IICANA solo como cliente |
| Niveles con `LEVEL_LABELS` | 🟡 | 12 archivos con mapas propios (detalle de alumno, curso e inscripción en los dos portales; `CourseList`, `EnrollmentForm`, `EnrollmentList`, `GradeList`, `StudentList`, `DashboardCharts`, `StudentsLevelChart`). Etiquetas distintas para el mismo nivel (I-08) |
| Un solo término por concepto | 🟡 | Promover / promocionar / completado (I-10); egresado / graduado (I-11); comunicaciones / mensajes / notificaciones (I-09); "Eval. Docentes" (abreviado) vs. "Evaluar Docente" |
| Rol "Director" | 🟡 | El instituto tiene una **Directora** (`[E2]` §2) y el menú dice "Director" (`Sidebar.tsx:105`). Usar "Dirección" como etiqueta neutra |
| Reglas en lenguaje del cliente | ⛔ | Las pantallas muestran "promedio ≥ 7.0" y "Umbral nota: 7" y los emails "mínimo 80%": reglas que la Directora ya cambió |
| Documentación técnica | ⛔ | `CONTEXT.md` y `CLAUDE.md` siguen declarando "Asistencia mínima 80%" y "Nota mínima 7/10" como reglas vigentes. `[E3]` y `[E6]` marcan la edad mínima como pendiente cuando ya está implementada |

---

## 7. Historias BA-NNN

**Prioridad sugerida:** 🔴 **P1**, antes del coloquio (contradice al cliente o rompe una
regla central) · 🟡 **P2**, este cuatrimestre · 🟢 **P3**, mejora o Práctica III.
**Tipo:** Historia · Bug de regla de negocio · Requisito no funcional.
Cada historia cita los `DEV-NNN` con la causa técnica; no se repite el detalle de
implementación.

### 7.1 Índice

| ID | Título | Tipo | Prioridad | Requisito | Ticket / DEV |
|---|---|---|:-:|---|---|
| BA-001 | Escala de notas 0–100 y nota mínima 70 | Bug de regla | 🔴 P1 | RF-14, RF-15, R-07, R-08 | SCRUM-188 |
| BA-002 | Asistencia mínima 70% en toda la app | Bug de regla | 🔴 P1 | RF-15, R-05, R-06 | SCRUM-190, DEV-034 |
| BA-003 | Solo se promueve a quien cumple los requisitos | Bug de regla | 🔴 P1 | RF-16, R-21 | SCRUM-248, DEV-036 |
| BA-004 | Débito y crédito, con descuentos y recargo | Historia | 🔴 P1 | RF-23, R-15, R-16 | SCRUM-180 |
| BA-005 | Bajas lógicas: no se borra historia académica ni contable | Bug de regla | 🔴 P1 | RF-01, RF-04, RNF-05 | DEV-019 |
| BA-006 | Reactivar una inscripción valida cupo y horario | Bug de regla | 🔴 P1 | RF-06, RF-08 | SCRUM-244, DEV-020 |
| BA-007 | Mora escalonada automática, con avisos independientes | Bug de regla | 🔴 P1 | RF-27, RNF-10 | DEV-025, DEV-026 |
| BA-008 | Corte de acceso por 2 cuotas impagas, en cualquier estado de mora | Bug de regla | 🟡 P2 | RF-28, R-13 | DEV-031 |
| BA-009 | Reactivación del alumno que regulariza la deuda | Historia | 🟡 P2 | RF-29, CB7 | I-06, DEV-029 |
| BA-010 | El docente solo califica en sus cursos e inscripciones activas | Bug de regla | 🔴 P1 | RF-14 | SCRUM-246, DEV-010 |
| BA-011 | Toma de asistencia: quién, de qué curso y de qué fecha | Bug de regla | 🔴 P1 | RF-11 | I-01, DEV-011, DEV-037 |
| BA-012 | Inscribir solo alumnos y cursos habilitados | Bug de regla | 🟡 P2 | RF-08 | DEV-021 |
| BA-013 | Un pago anulado no se puede cobrar | Bug de regla | 🔴 P1 | RF-20, CB4 | SCRUM-249, DEV-030 |
| BA-014 | Ciclo lectivo y definición de egreso | Historia | 🟡 P2 | RF-19, R-22 | DEV-035 |
| BA-015 | Reclamos accesibles desde el menú del alumno | Historia | 🟡 P2 | RF-36 | E-02 |
| BA-016 | El alumno ve y descarga su recibo y su certificado | Historia | 🟡 P2 | RF-17, RF-20 | `[E7]` §2.4–2.5 |
| BA-017 | Vencimiento el día 10 controlado en el servidor | Bug de regla | 🟢 P3 | RF-21, R-10 | — |
| BA-018 | Matrícula y cuota mensual por curso, generadas automáticamente | Historia | 🟡 P2 | RF-22, RF-24 | SCRUM-179, SCRUM-181 |
| BA-019 | Alerta temprana de asistencia y riesgo alineada al 70% | Bug de regla | 🔴 P1 | RF-32, RF-33, R-24, R-25 | DEV-038 |
| BA-020 | Lista de espera para cursos llenos | Historia | 🟢 P3 | RF-09 | SCRUM-233, I-04 |
| BA-021 | Recursado con descuento y cambio de grupo | Historia | 🟢 P3 | RF-10, RF-18 | C-02, C-03, I-05 |
| BA-022 | Aviso de 2 ausencias a la administrativa y al docente | Historia | 🟡 P2 | RF-13 | — |
| BA-023 | Promedio ponderado por tipo de evaluación | Historia | 🟡 P2 | RF-14, R-09 | (pesos a relevar) |
| BA-024 | Aulas y franja horaria del instituto en los cursos | Historia | 🟢 P3 | RF-07, R-32 | — |
| BA-025 | Anonimato real de la encuesta docente | Requisito no funcional | 🔴 P1 | RF-37, RNF-12 | SCRUM-250, DEV-003, DEV-012 |
| BA-026 | ABM y objetivo de observaciones de clase | Historia | 🟢 P3 | RF-38, R-31 | D-05 |
| BA-027 | El instituto siempre conserva al menos un usuario de Dirección | Bug de regla | 🟡 P2 | RF-45, RNF-03 | SCRUM-247, DEV-023 |
| BA-028 | Historial académico unificado en el detalle del alumno | Historia | 🟢 P3 | RF-45 | — |
| BA-029 | Vocabulario único y en español | Requisito no funcional | 🟡 P2 | RNF-01, RNF-09 | — |
| BA-030 | Documentación alineada con las reglas vigentes | Requisito no funcional | 🔴 P1 | `[DOC]`, `[E3]`, `[E6]` | — |
| BA-031 | "Smart Learning" como nombre del producto en la documentación | Requisito no funcional | 🟢 P3 | RNF-02 | — |
| BA-032 | Tiempo de respuesta operable con varios usuarios a la vez | Requisito no funcional | 🟡 P2 | RNF-07 | DEV-005, DEV-006, DEV-042 |

**Totales:** 32 historias · 🔴 P1: 13 · 🟡 P2: 12 · 🟢 P3: 7.

### 7.2 Detalle

#### BA-001 · Escala de notas 0–100 y nota mínima 70
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[REL-2026]` SCRUM-188

> Como **Directora** quiero que las notas se carguen y se informen de 0 a 100, con
> aprobación desde 70, para aplicar el criterio que definí en mayo de 2026.

- **Dado** un docente que carga una nota, **cuando** ingresa 85, **entonces** se guarda
  como 85 y el alumno la ve como "85/100".
- **Dado** un docente que carga una nota, **cuando** ingresa 101 o −1, **entonces** se
  rechaza con "La nota debe estar entre 0 y 100".
- **Dado** el histórico cargado en escala 1–10, **cuando** se aplica la migración,
  **entonces** cada nota queda multiplicada por 10 y la columna admite 100
  (`numeric(5,2)`).
- **Dado** un promedio de 69,9, **cuando** se evalúa la promoción, **entonces** no cumple;
  **dado** 70, **entonces** cumple.
- **Dado** cualquier pantalla, reporte, email o notificación que muestra notas o
  "aprobado", **cuando** se la revisa, **entonces** usa 0–100 y el umbral de 70 desde una
  única constante (los 7 lugares de la sección 4.2, I-05).

#### BA-002 · Asistencia mínima 70% en toda la app
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[REL-2026]` SCRUM-190

> Como **Directora** quiero que el mínimo de asistencia para promover sea 70%, para que
> el sistema aplique el criterio pedagógico vigente.

- **Dado** un alumno con 70% de asistencia y promedio suficiente, **cuando** abro
  Promociones, **entonces** figura "Apto para promover".
- **Dado** un alumno con 69,5%, **cuando** se evalúa, **entonces** **no** cumple (sin
  redondear antes de comparar, DEV-034), salvo que el cliente defina otra regla de
  redondeo.
- **Dado** Promociones, Cierre de ciclo, los colores de las barras de asistencia y los
  emails, **cuando** los reviso, **entonces** muestran 70% y salen de la misma constante.
- **Dado** que el cliente no definió si la tardanza cuenta como presente, **cuando** se
  implementa, **entonces** la decisión queda registrada en Jira y en `[E5]`.

#### BA-003 · Solo se promueve a quien cumple los requisitos
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[E5]` decisión #1 · SCRUM-248 · DEV-036

> Como **Directora** quiero que el sistema impida promover a quien no cumple asistencia y
> nota, para que un certificado no se pueda emitir por error.

- **Dado** una inscripción sin notas o por debajo de algún umbral, **cuando** se intenta
  promover (botón, request directo o cierre de ciclo), **entonces** se rechaza con "No
  cumple los requisitos: asistencia X% (mínimo 70%), promedio Y (mínimo 70)".
- **Dado** el ABM de Inscripciones, **cuando** se edita el estado, **entonces** no aparece
  la opción "Completado": solo se llega a ese estado por promoción.
- **Dado** una inscripción `withdrawn` o ya `completed`, **cuando** se intenta promover,
  **entonces** se rechaza.
- **Dado** las inscripciones ya completadas sin cumplir requisitos (hay al menos una en
  `/director/year-end`), **cuando** se despliega el cambio, **entonces** Dirección recibe un
  listado para revisarlas.

#### BA-004 · Débito y crédito, con descuentos y recargo
**Tipo:** Historia · **Prioridad:** 🔴 P1 (modelo) / 🟡 P2 (porcentajes) · **Origen:** `[REL-2026]` SCRUM-180 · bloqueada por I-02

> Como **administrativa** quiero registrar si el cobro fue en efectivo, transferencia,
> débito o crédito, y que el sistema aplique el descuento o el recargo, para cobrar el
> importe correcto sin calcularlo a mano.

- **Dado** un cobro, **cuando** elijo el método, **entonces** las opciones son Efectivo,
  Transferencia, Débito y Crédito ("Tarjeta" deja de existir; los cobros históricos con
  `card` se informan como "Tarjeta (sin especificar)").
- **Dado** los porcentajes configurados por Dirección, **cuando** cobro una cuota de
  $10.000 dentro del plazo, **entonces** el recibo muestra el importe base, el descuento o
  recargo aplicado y el total.
- **Dado** que Dirección cambia un porcentaje, **cuando** se cobra después, **entonces** se
  usa el nuevo valor y los recibos anteriores no cambian.
- **Dado** el reporte de pagos y el reporte diario, **cuando** se generan, **entonces**
  totalizan por los 4 métodos (SCRUM-185).

#### BA-005 · Bajas lógicas: no se borra historia académica ni contable
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[HAL]` D-02, `[E6]` §4 · DEV-019

> Como **Directora** quiero que dar de baja un alumno, un docente o un curso no borre sus
> pagos, notas, asistencia ni evaluaciones, para que la contadora pueda auditar y el
> historial no se pierda.

- **Dado** un alumno con pagos cobrados, **cuando** lo doy de baja, **entonces** pasa a
  `inactive`, su acceso queda bloqueado y sus pagos siguen apareciendo en los reportes.
- **Dado** un curso con inscripciones, **cuando** intento eliminarlo, **entonces** el
  sistema lo impide y ofrece "Cerrar curso" (`completed`) o "Desactivar" (`inactive`).
- **Dado** un docente con encuestas u observaciones, **cuando** lo doy de baja,
  **entonces** se conserva su historial de evaluación.
- **Dado** cualquier baja, **cuando** se ejecuta, **entonces** queda registrado quién la
  hizo y cuándo.

#### BA-006 · Reactivar una inscripción valida cupo y horario
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[E5]` R1–R3 · SCRUM-244 · DEV-020

> Como **administrativa** quiero que reactivar una inscripción dada de baja aplique las
> mismas reglas que una inscripción nueva, para no superar nunca los 15 alumnos.

- **Dado** un curso con 15 inscripciones activas, **cuando** reactivo una `withdrawn` de
  ese curso, **entonces** se rechaza con "El curso alcanzó el cupo máximo de 15 alumnos".
- **Dado** que el alumno tiene otro curso activo en el mismo horario, **cuando** reactivo,
  **entonces** se rechaza con el mensaje de choque de horario.
- **Dado** que ya existe otra inscripción activa del alumno en ese curso, **cuando**
  reactivo, **entonces** veo "El alumno ya está inscripto en este curso" (no un error 500).

#### BA-007 · Mora escalonada automática, con avisos independientes
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[REL-2025]` Políticas de Pago, `[E5]` R6 · DEV-025, DEV-026

> Como **Directora** quiero que el sistema marque las cuotas vencidas, me avise a los 15
> días y suspenda a los 30 sin que nadie tenga que apretar un botón, para que la política
> de mora se cumpla siempre igual.

- **Dado** una cuota pendiente con vencimiento ayer, **cuando** corre el proceso diario,
  **entonces** pasa a "Vencida" sin intervención humana.
- **Dado** una cuota vencida hace 16 días, **cuando** corre el proceso diario, **entonces**
  Dirección recibe la alerta de mora **aunque** el alumno ya haya recibido su email de
  cuota vencida (cada aviso tiene su propia marca).
- **Dado** una cuota vencida hace 31 días, **cuando** corre el proceso diario, **entonces**
  el alumno queda suspendido y Dirección es notificada una sola vez.
- **Dado** el botón "Verificar mora", **cuando** se usa, **entonces** hace lo mismo que el
  proceso diario y no duplica avisos.

#### BA-008 · Corte de acceso por 2 cuotas impagas, en cualquier estado de mora
**Tipo:** Bug de regla de negocio · **Prioridad:** 🟡 P2 · **Origen:** `[E5]` R7 · DEV-031

> Como **Directora** quiero que se restrinja el portal del alumno que debe 2 cuotas, sin
> importar si una ya está en suspensión, para que la regla se aplique en el caso real.

- **Dado** un alumno con una cuota `suspended` y otra `overdue`, **cuando** corre el
  proceso, **entonces** se le restringe el acceso.
- **Dado** un alumno restringido, **cuando** queda con menos de 2 cuotas impagas,
  **entonces** el acceso se rehabilita según lo que decida el cliente en BA-009.
- **Dado** un alumno restringido, **cuando** intenta usar cualquier acción del portal (no
  solo las páginas), **entonces** se rechaza (DEV-031).

#### BA-009 · Reactivación del alumno que regulariza la deuda
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[E6]` CB7 · bloqueada por I-06 · DEV-029

> Como **administrativa** quiero que, al cobrarle la deuda a un alumno suspendido, el
> sistema lo reactive (o le pida a Dirección que lo haga), para que no quede suspendido
> por olvido.

- **Dado** una cuota en estado `suspended`, **cuando** la cobro, **entonces** el sistema lo
  permite y emite el recibo (hoy no se puede, DEV-029).
- **Dado** que el alumno ya no tiene cuotas con más de 30 días de mora, **cuando** se
  registra el cobro, **entonces** pasa a `active` automáticamente **o** Dirección recibe
  "X regularizó su deuda: ¿reactivar?" (según la respuesta a I-06).
- **Dado** una reactivación, **cuando** ocurre, **entonces** queda registrado quién y
  cuándo.

#### BA-010 · El docente solo califica en sus cursos e inscripciones activas
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[E4]` §3 · SCRUM-246 · DEV-010

> Como **Directora** quiero que cada docente solo pueda cargar, editar o borrar notas de
> los cursos que dicta, para que la nota (insumo de la promoción) sea confiable.

- **Dado** un docente, **cuando** intenta cargar una nota en una inscripción de un curso
  que no dicta, **entonces** se rechaza con "Solo podés calificar en tus cursos".
- **Dado** una inscripción `withdrawn` o `completed`, **cuando** un docente le carga o
  edita una nota, **entonces** se rechaza (Dirección sí puede, con un motivo obligatorio).
- **Dado** un error de la base, **cuando** falla la carga, **entonces** el mensaje está en
  español y no expone el error técnico.

#### BA-011 · Toma de asistencia: quién, de qué curso y de qué fecha
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** RF-04 anteproyecto, G-06 · decisión I-01 · DEV-011, DEV-037

> Como **Directora** quiero que la asistencia la tome quien yo defina, solo en su curso y
> en un día de clase real, para que el 70% de asistencia se calcule sobre datos válidos.

- **Dado** que el cliente responde I-01, **cuando** se implementa, **entonces** solo los
  roles definidos pueden tomar lista, y la decisión queda escrita en `[E4]` §3.
- **Dado** un docente, **cuando** intenta tomar, corregir o borrar la lista de un curso que
  no dicta, **entonces** se rechaza.
- **Dado** una fecha posterior a hoy (en hora de Argentina, DEV-032), **cuando** se toma
  la lista, **entonces** se rechaza con "No se puede registrar asistencia de una fecha
  futura".
- **Dado** una fecha en la que el curso no se dicta, **cuando** se toma la lista,
  **entonces** el sistema advierte "El curso no se dicta los martes. ¿Es una clase de
  recuperación?" y pide confirmación.
- **Dado** una sesión borrada, **cuando** se elimina, **entonces** queda registro de quién
  la borró.

#### BA-012 · Inscribir solo alumnos y cursos habilitados
**Tipo:** Bug de regla de negocio · **Prioridad:** 🟡 P2 · **Origen:** `[E6]` diagramas de estado · DEV-021

> Como **administrativa** quiero que el sistema me impida inscribir a un alumno suspendido
> o en un curso cerrado, para no generar inscripciones que después hay que deshacer.

- **Dado** un alumno `suspended` o con acceso restringido, **cuando** lo inscribo,
  **entonces** se rechaza con "El alumno tiene deuda pendiente: regularizá antes de
  inscribir".
- **Dado** un alumno `inactive` o `graduated`, **cuando** lo inscribo, **entonces** el
  sistema pide confirmar el reingreso y lo pasa a `active`.
- **Dado** un curso `inactive` o `completed`, **cuando** intento inscribir, **entonces**
  se rechaza con "El curso no está abierto a inscripciones", y el curso no aparece en el
  selector.

#### BA-013 · Un pago anulado no se puede cobrar
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[HAL]` D-02 · SCRUM-249 · DEV-030

> Como **contadora** (a través de Dirección) quiero que un pago anulado quede anulado para
> siempre, para que la conciliación cierre.

- **Dado** un pago `cancelled`, **cuando** alguien intenta cobrarlo, **entonces** se
  rechaza con "El pago está anulado. Registrá uno nuevo".
- **Dado** un pago `paid`, **cuando** alguien intenta cobrarlo otra vez, **entonces** se
  rechaza.
- **Dado** el cambio manual de estado de un pago, **cuando** se usa, **entonces** solo
  permite las transiciones del diagrama de `[E6]` §1.3.

#### BA-014 · Ciclo lectivo y definición de egreso
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[E5]` decisión #2, `[REL-2025]` "sin historial comparativo entre períodos" · DEV-035

> Como **Directora** quiero cerrar un ciclo lectivo concreto y que "Egresado" signifique
> lo que significa en el instituto, para comparar períodos y no egresar alumnos que
> siguen cursando.

- **Dado** el cierre de ciclo, **cuando** lo ejecuto, **entonces** solo evalúa las
  inscripciones del ciclo elegido (por ejemplo "1er cuatrimestre 2026") y no las de
  ciclos anteriores.
- **Dado** un alumno que promueve Principiante, **cuando** se cierra el ciclo,
  **entonces** **no** queda Egresado y su nivel sugerido pasa a Elemental (regla de egreso
  a confirmar: propuesta, egresa al completar Avanzado).
- **Dado** un alumno con una inscripción dada de baja y el resto completas, **cuando** se
  evalúa el egreso, **entonces** la baja no lo impide.
- **Dado** el cierre de ciclo ejecutado dos veces, **cuando** corre la segunda,
  **entonces** no repite promociones ni emails (DEV-035).

#### BA-015 · Reclamos accesibles desde el menú del alumno
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[REL-2025]` cuaderno de reclamos, `[E3]` UC13

> Como **alumno** quiero encontrar "Reclamos" en mi menú, para presentar un reclamo sin
> tener que pedirle el link a nadie.

- **Dado** un alumno logueado, **cuando** abre el menú, **entonces** ve "Reclamos" con sus
  reclamos y el botón "Nuevo reclamo".
- **Dado** que el cliente decide si el docente también reclama, **cuando** se decide,
  **entonces** se conecta `createComplaintAsProfesorAction` a una pantalla o se elimina.

#### BA-016 · El alumno ve y descarga su recibo y su certificado
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[E7]` §2.4 y §2.5, `[REL-2025]` "recibos manuales sin trazabilidad digital"

> Como **alumno** quiero descargar el recibo de cada cuota pagada y el certificado de cada
> nivel aprobado, para tener mis comprobantes sin ir a la secretaría.

- **Dado** un pago `paid` del alumno, **cuando** entra a Pagos, **entonces** ve "Ver
  recibo" y lo puede imprimir o guardar en PDF.
- **Dado** una inscripción `completed` del alumno, **cuando** entra a Mis Notas (o a una
  sección "Certificados"), **entonces** ve "Descargar certificado".
- **Dado** un recibo o certificado de **otro** alumno, **cuando** intenta abrirlo,
  **entonces** el sistema lo rechaza.
- **Dado** el portal administrativo, **cuando** abre un recibo, **entonces** la URL es la
  de su portal y no la de `/director` (E-03).

#### BA-017 · Vencimiento el día 10 controlado en el servidor
**Tipo:** Bug de regla de negocio · **Prioridad:** 🟢 P3 · **Origen:** `[REL-2025]` Políticas de Pago

> Como **Directora** quiero que las cuotas venzan el día 10, para que la mora se calcule
> igual para todos.

- **Dado** una cuota nueva, **cuando** se elige un vencimiento que no es día 10,
  **entonces** el sistema pide confirmar "La política del instituto es el día 10. ¿Usar
  igual el día 25?" y registra el motivo.
- **Dado** la generación automática de cuotas (BA-018), **cuando** se generan, **entonces**
  vencen el día 10.

#### BA-018 · Matrícula y cuota mensual por curso, generadas automáticamente
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[REL-2025]`, `[E5]` BPMN · SCRUM-179, SCRUM-181 · bloqueada por I-03

> Como **administrativa** quiero que el sistema genere la matrícula al inscribir y la
> cuota de cada mes según el curso, para no cargarlas a mano de a una.

- **Dado** que el curso tiene definido su valor de cuota (y de matrícula, según I-03),
  **cuando** inscribo a un alumno, **entonces** se genera la matrícula pendiente.
- **Dado** el primer día de cada mes, **cuando** corre el proceso, **entonces** se genera
  una cuota por inscripción activa, con vencimiento el día 10, sin duplicar.
- **Dado** un pago, **cuando** lo consulto, **entonces** sé de qué concepto (matrícula o
  cuota) y de qué curso es.

#### BA-019 · Alerta temprana de asistencia y riesgo alineada al 70%
**Tipo:** Bug de regla de negocio · **Prioridad:** 🔴 P1 · **Origen:** `[E2]` §3.3, `[E5]` decisión #7 · DEV-038

> Como **docente** quiero enterarme cuando un alumno se acerca al mínimo de asistencia,
> no cuando ya lo perdió, para poder intervenir a tiempo.

- **Dado** un mínimo de promoción de 70%, **cuando** un alumno baja del umbral de alerta
  (propuesta: 80%, configurable por Dirección), **entonces** el docente y Dirección
  reciben el aviso una sola vez.
- **Dado** el email de alerta, **cuando** se envía, **entonces** informa el mínimo vigente
  (70%), tomado de la misma constante que la promoción.
- **Dado** la detección de riesgo, **cuando** evalúa pagos, **entonces** cuenta las cuotas
  `overdue` **y** las `suspended`.
- **Dado** la señal de rendimiento, **cuando** se calcula, **entonces** considera las
  notas del curso (escala 0–100) además de las autoevaluaciones, o la decisión de usar
  solo autoevaluaciones queda justificada por escrito.

#### BA-020 · Lista de espera para cursos llenos
**Tipo:** Historia · **Prioridad:** 🟢 P3 · **Origen:** flujograma `[REL-2025]` · SCRUM-233 · bloqueada por I-04

> Como **administrativa** quiero anotar en lista de espera a quien no entra en un curso
> lleno, para avisarle cuando se libere una vacante.

- **Dado** un curso con 15 activos, **cuando** intento inscribir, **entonces** el sistema
  ofrece "Agregar a la lista de espera".
- **Dado** que se libera una vacante, **cuando** se da de baja una inscripción,
  **entonces** se notifica al primero de la lista y a la administración.

#### BA-021 · Recursado con descuento y cambio de grupo
**Tipo:** Historia · **Prioridad:** 🟢 P3 · **Origen:** `[REL-2025]` políticas · C-02, C-03 · bloqueada por I-05

> Como **administrativa** quiero registrar que un alumno recursa el nivel (con su
> descuento) o que se cambia de grupo en el mismo cuatrimestre, para no perder su
> historia ni cobrarle de más.

- **Dado** un alumno que no promovió, **cuando** se cierra el ciclo, **entonces** puedo
  inscribirlo como "Recursante" en el mismo nivel y la cuota aplica el descuento definido.
- **Dado** un cambio de grupo, **cuando** lo registro, **entonces** la asistencia y las
  notas previas se conservan y cuentan para la promoción.

#### BA-022 · Aviso de 2 ausencias a la administrativa y al docente
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[REL-2025]` Proceso 2

> Como **administrativa** quiero recibir el aviso de 2 ausencias seguidas de un alumno,
> porque soy quien se comunica con la familia.

- **Dado** 2 ausencias consecutivas, **cuando** se registra la segunda, **entonces**
  reciben la notificación Dirección, las administrativas y el docente del curso.
- **Dado** un alumno menor de edad, **cuando** se genera el aviso, **entonces** indica que
  hay que contactar al tutor (el portal del tutor sigue fuera de alcance, RF-35).

#### BA-023 · Promedio ponderado por tipo de evaluación
**Tipo:** Historia · **Prioridad:** 🟡 P2 · **Origen:** `[E2]` §4.2 ("no todas pesan igual") · pesos a relevar

> Como **Directora** quiero que el final pese más que una tarea, para que el promedio
> refleje el criterio pedagógico del instituto.

- **Dado** los pesos definidos por Dirección (por ejemplo final 40%, parcial 30%, oral
  15%, tarea y quiz 15%), **cuando** se calcula el promedio, **entonces** es ponderado.
- **Dado** un alumno sin nota en un tipo, **cuando** se calcula, **entonces** se
  redistribuye el peso entre los tipos con nota (o se aplica la regla que defina el
  cliente).
- **Dado** que el cliente decide mantener el promedio simple, **cuando** lo decide,
  **entonces** se corrige `[E2]` §4.2.

#### BA-024 · Aulas y franja horaria del instituto en los cursos
**Tipo:** Historia · **Prioridad:** 🟢 P3 · **Origen:** `[E2]` §1 (3 aulas, turnos de 8 a 13 y de 15 a 21)

> Como **Directora** quiero que el sistema no me deje armar dos cursos en la misma aula a
> la misma hora, ni fuera del horario del instituto.

- **Dado** el aula 2 ocupada lunes y miércoles de 18:00 a 19:30, **cuando** creo otro
  curso en el aula 2 que se superpone, **entonces** se rechaza indicando el curso en
  conflicto.
- **Dado** un horario fuera de las franjas de 8 a 13 y de 15 a 21, **cuando** creo el
  curso, **entonces** se rechaza (o se pide confirmar, si el cliente lo prefiere).
- **Dado** el formulario, **cuando** elijo el aula, **entonces** es un selector con las
  aulas del instituto, no un texto libre.

#### BA-025 · Anonimato real de la encuesta docente
**Tipo:** Requisito no funcional · **Prioridad:** 🔴 P1 · **Origen:** `[E3]` nota 6, `[HAL]` D-08 · SCRUM-250 · DEV-003, DEV-012

> Como **alumno** quiero que nadie, ni el docente ni Dirección, pueda saber qué respondí,
> para evaluar con sinceridad.

- **Dado** una encuesta enviada, **cuando** Dirección o el docente la consultan,
  **entonces** ven solo agregados por curso, sin forma de vincularla con un alumno.
- **Dado** el control de "una encuesta por alumno y curso", **cuando** se implementa,
  **entonces** el registro de "ya respondió" está separado de las respuestas.
- **Dado** un curso con menos de 3 respuestas, **cuando** se muestra el resultado,
  **entonces** se oculta el detalle para no permitir deducir quién respondió.

#### BA-026 · ABM y objetivo de observaciones de clase
**Tipo:** Historia · **Prioridad:** 🟢 P3 · **Origen:** `[REL-2025]` (2 por docente por cuatrimestre) · D-05

> Como **Directora** quiero corregir una observación mal cargada y ver qué docentes no
> tienen sus 2 observaciones del cuatrimestre.

- **Dado** una observación propia, **cuando** la edito o la doy de baja, **entonces** el
  cambio queda registrado.
- **Dado** el listado de docentes, **cuando** lo abro, **entonces** veo "1/2" o "2/2"
  observaciones del cuatrimestre en curso.

#### BA-027 · El instituto siempre conserva al menos un usuario de Dirección
**Tipo:** Bug de regla de negocio · **Prioridad:** 🟡 P2 · **Origen:** `[E4]` §3 · SCRUM-247 · DEV-023

> Como **Directora** quiero que el sistema no me deje bloquearme o quitarme el rol a mí
> misma, para no dejar el instituto sin nadie que lo administre.

- **Dado** que soy el único usuario de Dirección, **cuando** intento bloquearme o cambiar
  mi rol, **entonces** se rechaza con "Tiene que quedar al menos un usuario de Dirección".
- **Dado** un cambio de rol de otro usuario, **cuando** se guarda, **entonces** el acceso
  efectivo cambia inmediatamente (DEV-023).

#### BA-028 · Historial académico unificado en el detalle del alumno
**Tipo:** Historia · **Prioridad:** 🟢 P3 · **Origen:** `[E2]` §1.2 ("Historial académico: unificado por alumno")

> Como **administrativa** quiero ver en la ficha del alumno sus cursos, asistencia,
> notas, pagos y certificados, para atenderlo en el mostrador sin abrir cinco pantallas.

- **Dado** la ficha de un alumno, **cuando** la abro, **entonces** veo por inscripción el %
  de asistencia, el promedio y el estado de promoción, además de los pagos.

#### BA-029 · Vocabulario único y en español
**Tipo:** Requisito no funcional · **Prioridad:** 🟡 P2 · **Origen:** `CLAUDE.md`, `[E6]` §3

> Como **usuario** de cualquier rol quiero que el sistema use siempre las mismas palabras
> y en español, para no dudar si dos pantallas hablan de lo mismo.

- **Dado** cualquier pantalla, **cuando** muestra un nivel, **entonces** usa
  `LEVEL_LABELS` (se eliminan los 12 mapas locales); si hace falta una versión corta para
  gráficos, se agrega `LEVEL_SHORT_LABELS` en el mismo archivo.
- **Dado** el menú, **cuando** lo veo, **entonces** dice "Inicio" en lugar de "Dashboard",
  y la mensajería tiene un solo nombre en los 4 portales.
- **Dado** el tipo de evaluación `quiz`, **cuando** se muestra, **entonces** dice
  "Cuestionario" (o el término que elija el cliente).
- **Dado** el resultado de una inscripción, **cuando** se muestra, **entonces** se usa
  "Promovido" en todas las pantallas, y "Egresado" para el alumno.
- **Dado** un error técnico, **cuando** llega a la UI, **entonces** se muestra en español.

#### BA-030 · Documentación alineada con las reglas vigentes
**Tipo:** Requisito no funcional · **Prioridad:** 🔴 P1 (antes del coloquio) · **Origen:** Encuentro 5 ("defiende cada regla desde el cliente")

> Como **equipo** queremos que la documentación diga lo mismo que el sistema y que el
> cliente, para que ninguna pregunta del tribunal nos agarre con dos respuestas.

- **Dado** `CONTEXT.md` y `CLAUDE.md`, **cuando** se implementen BA-001 y BA-002,
  **entonces** dicen 70% y 70/100. Mientras tanto, marcan los valores viejos como "pendiente
  de actualizar (SCRUM-188/190)".
- **Dado** `[E3]` §5 y `[E6]` §3.4, **cuando** se revisan, **entonces** la edad mínima figura
  como implementada, con el mensaje real.
- **Dado** `[E6]` §2, **cuando** se revisa, **entonces** incorpora los casos CB10–CB24 de la
  sección 5.3 de este documento, o los justifica.

#### BA-031 · "Smart Learning" como nombre del producto en la documentación
**Tipo:** Requisito no funcional · **Prioridad:** 🟢 P3 · **Origen:** `CLAUDE.md` ("el branding es Smart Learning")

- **Dado** `presentacion-completa.md` y `encuentro-1-informativo.md`, **cuando** se
  exportan, **entonces** el producto se llama "Smart Learning", e IICANA aparece solo como
  el cliente (el instituto).

#### BA-032 · Tiempo de respuesta operable con varios usuarios a la vez
**Tipo:** Requisito no funcional · **Prioridad:** 🟡 P2 · **Origen:** `[E2]` §1.2 (inscripción en minutos), RNF de operación en mostrador · DEV-005, DEV-006, DEV-042

> Como **administrativa** quiero que las pantallas de pagos y notas carguen en segundos
> aunque otras dos compañeras y los docentes estén usando el sistema.

- **Dado** 5 usuarios concurrentes (3 administrativas + 2 docentes), **cuando** abren
  Pagos, Notas o Reportes, **entonces** cada pantalla carga en menos de 3 segundos
  (umbral a validar con el cliente).
- **Dado** que en esta revisión esas pantallas no respondieron en 120 s, **cuando** se
  corrija, **entonces** se registra la medición antes y después.
- **Dado** el entorno de pruebas, **cuando** los QA cargan datos, **entonces** no comparten
  la base con producción (DEV-005).

---

## 8. Preguntas para el cliente (bloquean historias)

Complementan la sección I de `hallazgos.md`. Las nuevas están marcadas con ★.

| # | Pregunta | Bloquea |
|---|---|---|
| I-01 | ¿Quién toma asistencia: el docente, la administrativa o ambos? | BA-011 |
| I-02 | Porcentajes de descuento (efectivo, transferencia/débito) y de recargo (crédito) | BA-004 |
| I-03 | Valor de la matrícula y de la cuota por curso o por nivel | BA-018 |
| I-04 / I-05 | ¿Se modelan la lista de espera y el recursado con descuento? | BA-020, BA-021 |
| I-06 | ¿El alumno que regulariza se reactiva solo o lo decide Dirección? | BA-008, BA-009 |
| ★ Q-01 | ¿La tardanza cuenta como presente para el 70%? ¿Cómo se redondea (69,5%)? | BA-002 |
| ★ Q-02 | ¿Cuánto pesa cada tipo de evaluación en el promedio? | BA-023 |
| ★ Q-03 | ¿Cuándo "egresa" un alumno: al completar Avanzado o al completar cualquier curso? | BA-014 |
| ★ Q-04 | ¿Con qué % de asistencia quiere enterarse de que un alumno está en riesgo? | BA-019 |
| ★ Q-05 | ¿Se puede vencer una cuota en un día distinto del 10 (por ejemplo, la matrícula)? | BA-017 |
| ★ Q-06 | ¿El docente puede borrar el material que subió? | RF-40 |
