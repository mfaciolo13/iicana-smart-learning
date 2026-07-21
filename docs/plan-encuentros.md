# Plan de los 7 Encuentros — Práctica Profesionalizante II

Estado del análisis: **21/07/2026**. Contrastado contra el código real, el board de Jira (SCRUM, 9 sprints) y la documentación existente en `docs/`.

---

## Diagnóstico general

| Columna de la hoja de ruta | Estado | Riesgo |
|---|---|---|
| **DEV** (requisito técnico) | ~90% cubierto | Bajo — salvo ABM incompleto (ver E3) |
| **FN** (requisito de análisis) | ~20% cubierto | **ALTO** — casi todo sin documentar |
| **SM/PO** (requisito de gestión) | ~60% cubierto | Medio — faltan dailies/retros/métricas escritas |

**La conclusión que importa:** el sistema está construido, el análisis no está escrito. La materia evalúa que puedas *justificar desde el negocio* lo que ya programaste. El 80% del trabajo pendiente es documental, no de código.

**Segundo problema:** el proyecto va adelantado. La hoja de ruta asume Sprint 0→5 alineados a Encuentro 1→7. Nosotros tenemos **Sprint 0 al 8**. Hay que armar una tabla de mapeo explícita, no fingir que fueron 6 sprints.

---

## Mapeo Sprint → Encuentro (para presentar)

| Encuentro | Sprints que lo respaldan | Fechas reales |
|---|---|---|
| 1 — Informativo | Sprint 0 | 19/01 – 02/02 |
| 2 — Validación de dominio | Sprint 0 + 1 | 19/01 – 16/02 |
| 3 — Datos base (ABM) | Sprint 1 + 2 | 02/02 – 02/03 |
| 4 — Identidad del sistema | Sprint 2 + 3 | 16/02 – 16/03 |
| 5 — Lógica de negocio | Sprint 4 + 5 + 6 | 16/03 – 25/05 |
| 6 — Casos borde | Sprint 7 | 27/05 – 11/06 |
| 7 — Entregables | Sprint 8 (+ 9 a crear) | 11/06 – hoy |

> Narrativa para el SM: *"Trabajamos en sprints de 2 semanas desde enero. Al momento del Encuentro N ya habíamos cerrado el Sprint M; presentamos el estado consolidado."*

⚠️ **Acción inmediata:** el Sprint 8 figura `active` con fecha de cierre 25/06 — lleva **26 días vencido**. Cerrarlo y abrir Sprint 9 antes de cualquier presentación. Un sprint vencido abierto es lo primero que un docente mira.

---

## Encuentro 1 — Informativo

| Req | Estado | Acción |
|---|---|---|
| FN: Presentación del proyecto | ⚠️ | Armar slide de contexto: IICANA, instituto de inglés, problema real |
| DEV: Sistema base + tecnologías justificadas | ✅ | `docs/ARQUITECTURA.md` + `CLAUDE.md` tienen el stack. Falta la **justificación** de cada elección |
| SM: Sprint 0 (equipo, roles, backlog, herramienta) | ✅ | Sprint 0 existe en Jira (19/01–02/02) |

**Pendiente:** tabla "tecnología → por qué la elegimos" (1 párrafo por ítem: Next.js, Supabase, Drizzle, Vercel, Resend).

---

## Encuentro 2 — Validación de dominio

| Req | Estado | Acción |
|---|---|---|
| FN: Procesos relevados del negocio (sin sistema) | ❌ | **Escribir**. Cómo trabajaba IICANA antes: planillas, WhatsApp, cobro en mostrador |
| FN: Justificación de cada entidad del DER desde el negocio | ❌ | **Escribir**. 17 tablas → 1 frase de negocio cada una |
| FN: Actores del negocio identificados | ⚠️ | Están implícitos en los 4 roles; falta el documento |
| DEV: DER 8–12 entidades | ✅ | Tenemos 17 tablas (`docs/BASE_DE_DATOS.md`). **Presentar un DER núcleo de 10–12**, el resto como anexo |
| DEV: Al menos una entidad transaccional | ✅ | `attendance`, `payments`, `grades`, `enrollments` |
| DEV: Relaciones reales | ✅ | FKs en `src/lib/drizzle/schema.ts` |
| SM: Story Map inicial | ❌ | **Armar**. Se puede reconstruir desde las épicas de Jira |
| SM: Template de US definido | ⚠️ | Existe `SCRUM-159` (template de bug). Falta template de User Story |

**Entregable a producir:** `docs/encuentro-2-dominio.md` — procesos + actores + justificación entidad por entidad.

**Trampa de este encuentro:** presentar 17 entidades cuando piden 8–12 se lee como falta de criterio. Definí el DER núcleo: `profiles, students, teachers, courses, enrollments, attendance, grades, payments, complaints, notifications` (10). Marketing, assessments, documents y teacher-evaluations van como módulos anexos.

---

## Encuentro 3 — Datos base (ABM)

| Req | Estado | Acción |
|---|---|---|
| FN: Casos de uso | ❌ | **Escribir** |
| FN: Cada ABM justificado por un actor | ❌ | **Escribir** |
| FN: Diccionario de datos | ❌ | **Escribir**. Campo por campo, significado de negocio |
| FN: Maestras vs transaccionales | ❌ | Clasificar las 17 tablas |
| DEV: **ABM completo de TODAS las entidades** | 🔴 | **Hay huecos reales — ver abajo** |
| DEV: Validaciones de integridad | ✅ | Sólidas (ver E6) |
| SM: Sprint 1 documentado, dailies, retro | ⚠️ | Sprint existe; faltan actas de daily y retro |

### 🔴 Huecos de ABM — el riesgo técnico más concreto del cuatrimestre

La consigna dice *"Dev: demuestra cada ABM ante **pedido imprevisto del docente**"*. Estos no se pueden demostrar:

| Entidad | Falta | Gravedad |
|---|---|---|
| **attendance** | Sin modificación **y** sin baja | 🔴 Crítico — `src/modules/attendance/actions.ts:23` bloquea re-registrar. **Una asistencia mal cargada es incorregible desde la UI** |
| **payments** | Sin baja/anulación; sin editar monto ni vencimiento | 🔴 Alto — un pago mal cargado no se puede anular |
| marketing_campaigns | Sin baja ni modificación | 🟡 Medio — pero `SCRUM-187` propone eliminar el módulo |
| class_observations | Sin baja ni modificación | 🟡 Medio |
| teacher_surveys | Sin baja ni modificación | 🟢 Bajo — justificable: son **anónimas**, editarlas rompería la anonimidad |
| documents | Sin modificación (sí tiene baja) | 🟢 Bajo — justificable: se reemplaza subiendo de nuevo |
| assessments | Sin edición de contenido (sí archivar) | 🟢 Bajo — justificable: las genera la IA |
| inquiries | Sin baja; sin listado propio | 🟡 Medio |

**Regla de decisión:** o lo implementás, o lo justificás desde el negocio. Las dos son respuestas válidas ante el docente — *"no existe"* no lo es.

- **Implementar (obligatorio):** corrección de asistencia + anulación de pago. Son los dos casos donde el negocio real *necesita* corregir un error de carga.
- **Justificar por escrito:** encuestas anónimas, documentos, evaluaciones IA.

---

## Encuentro 4 — Identidad del sistema

| Req | Estado | Acción |
|---|---|---|
| FN: Diagrama de actores | ❌ | **Dibujar** |
| FN: Cada rol surge de un actor real | ⚠️ | Está en `CLAUDE.md` pero como decisión técnica, no de negocio |
| FN: Permisos justificados desde el negocio | ⚠️ | Hay que reescribir el "por qué" del rol `administrativo` |
| DEV: Login funcionando | ✅ | Supabase Auth + flujo de invitación por Resend |
| DEV: Mínimo 2 roles con vistas distintas | ✅ | **4 roles** — supera el requisito |
| DEV: Landing según rol | ✅ | `src/app/(dashboard)/<rol>/` |
| DEV: ABMs anteriores siguen funcionando | ✅ | Verificar con `pnpm tsc --noEmit` + smoke test |
| SM: Roles validados con el cliente | ⚠️ | `SCRUM-170` (rol administrativo) y `SCRUM-191` (relevamiento con Directora) son la **evidencia de validación con cliente**. Documentarlo así |

**Punto fuerte para explotar:** el rol `administrativo` no estaba en el diseño original — nació de un relevamiento con la Directora (`SCRUM-191`). Ese es exactamente el tipo de trazabilidad negocio→sistema que la materia pide. Contalo como historia, no como feature.

---

## Encuentro 5 — Lógica de negocio

| Req | Estado | Acción |
|---|---|---|
| FN: Reglas en lenguaje del cliente | ⚠️ | Están en código; **traducir a lenguaje de negocio** |
| FN: Diagrama de flujo / BPMN del proceso principal | ❌ | **Dibujar** — proceso: inscripción → cursada → promoción |
| FN: Trazabilidad regla ↔ requerimiento real | ❌ | Tabla regla → issue de Jira → quién lo pidió |
| DEV: Proceso central de punta a punta | ✅ | Inscripción → asistencia → notas → promoción → certificado |
| DEV: El sistema **decide**, no solo guarda | ✅ | **Muy fuerte** |
| DEV: Al menos una automatización real | ✅ | **Tenemos 9** |
| SM: Sprint 3 documentado + métricas | ⚠️ | Faltan métricas escritas |

### Automatizaciones implementadas (este es el punto más fuerte del proyecto)

| Regla de negocio | Dónde vive |
|---|---|
| Promoción: ≥80% asistencia **y** ≥7,0 promedio | `promotions.service.ts:85` |
| Cierre de ciclo: promueve en lote y gradúa al alumno sin cursos pendientes | `year-end.service.ts:130` |
| Mora: pendiente + vencido → `overdue` | `payments.service.ts:132` |
| >15 días de mora → alerta al director | `payments.service.ts:151` |
| >30 días de mora → suspende alumno y pagos | `payments.service.ts:184` |
| 2+ cuotas vencidas → restringe acceso al portal | `automations/actions.ts:78` |
| Riesgo de abandono: cruza mora + asistencia <70% + rendimiento <60% → none/low/medium/high | `risk-detection.service.ts:21` |
| 2 ausencias consecutivas → notifica al director | `attendance/actions.ts:36` |
| Cruce del 70% de asistencia → alerta a docente y dirección (solo la 1ª vez) | `attendance.service.ts:224` |
| Autoevaluación diagnóstica IA cada N clases | `auto-assessment.service.ts:41` |
| 5 crons diarios (recordatorio de clase, de pago, mora, reporte diario, riesgo) | `vercel.json` + `cron.service.ts` |

**Cómo presentarlo:** el docente pregunta *"¿el sistema decide o solo guarda?"*. La respuesta es la detección de riesgo de abandono: cruza tres fuentes de datos independientes y emite un juicio que ningún humano pidió. Eso es lo que hay que demostrar en vivo.

---

## Encuentro 6 — Casos borde

| Req | Estado | Acción |
|---|---|---|
| FN: Diagramas de estado de entidades principales | ⚠️ | Los enums están mapeados; **falta dibujar los diagramas** |
| FN: Casos borde desde los estados | ⚠️ | Existe `docs/encuentro-6-casos-borde.docx` — **revisar y actualizar** |
| FN: Lista de excepciones | ✅ | Buena cobertura en código |
| DEV: El sistema rechaza lo que debe | ✅ | ~35 validaciones con mensaje |
| DEV: El sistema **explica** por qué rechaza | ✅ | Todos los mensajes en español, orientados al usuario |
| SM: Sprint 4 documentado + retro con decisiones | ⚠️ | Falta acta de retro |

### Estados a diagramar (5 diagramas)

- `student_status`: active → suspended → active | graduated | inactive
- `enrollment_status`: active → completed | withdrawn
- `payment_status`: pending → paid | overdue → suspended
- `complaint_status`: open → in_progress → resolved → closed
- `assessment_status`: draft → published → archived

### ⚠️ Trabajo sin commitear

Hay dos migraciones en el working tree, sin commitear:

- `0010_attendance_unique_constraint.sql` → cierra `SCRUM-232`
- `0011_enrollments_unique_active.sql` → cierra `SCRUM-231`

Ambas tienen su issue **abierto** en Jira. Son exactamente el material de este encuentro (concurrencia en cupo e inscripción duplicada, resueltas con constraint de BD + `SELECT FOR UPDATE`). **Commitear, aplicar y cerrar los issues** — y contarlo como el hallazgo estrella del sprint de casos borde.

---

## Encuentro 7 — Entregables del sistema

| Req | Estado | Acción |
|---|---|---|
| FN: Especificación de cada reporte (quién, para qué decisión, con qué datos) | ❌ | **Escribir** — 1 ficha por reporte |
| FN: Trazabilidad reporte ↔ requerimiento | ❌ | **Escribir** |
| FN: Valor que entrega cada salida | ❌ | **Escribir** |
| DEV: Reportes/exportaciones funcionando | ✅ | 3 Excel + certificados + recibos + reporte diario por email |
| DEV: Transforma datos en información | ✅ | Ej.: % de asistencia calculado, no almacenado |
| DEV: Todo lo anterior sigue funcionando | ⚠️ | **Hacer un smoke test completo antes de presentar** |
| SM: Sprint 5 documentado | ⚠️ | Cerrar Sprint 8, abrir Sprint 9 |
| SM: **Estado honesto del backlog** | ⚠️ | 45 issues abiertos. Clasificar: hecho / falta / entra a Práctica III |
| SM: Plan de entrega a Práctica III | ❌ | **Escribir** |

### Salidas del sistema

| Salida | Quién la pide | Formato |
|---|---|---|
| Reporte de asistencia | Dirección | Excel |
| Reporte de notas | Dirección | Excel |
| Reporte de pagos | Dirección | Excel |
| Certificado de promoción | Alumno / Dirección | Imprimible |
| Recibo de pago | Alumno | Imprimible |
| Reporte diario | Dirección | Email automático |

**Hueco a decidir:** los 3 reportes Excel son **solo `director`**. El rol `administrativo` no accede a ninguno. O se le habilita el de pagos, o se justifica la exclusión desde el negocio. No lo dejes sin respuesta — es la pregunta obvia.

**Para el backlog honesto (Práctica III):** el rediseño de pagos (`SCRUM-178`: matrícula, pago online, descuentos, ARCA), el CI/CD (`SCRUM-150`) y la migración de escala de notas a porcentaje (`SCRUM-188`) son candidatos naturales. Presentarlos como *decisión de alcance*, no como deuda.

---

## Plan de trabajo — 3 bloques

### Bloque A — Documentación de análisis (FN) · el grueso del esfuerzo

| # | Entregable | Encuentro |
|---|---|---|
| A1 | `encuentro-2-dominio.md` — procesos sin sistema, actores, justificación de entidades | 2 |
| A2 | DER núcleo (10–12 entidades) + anexo | 2 |
| A3 | Story Map + template de User Story | 2 |
| A4 | Casos de uso + diccionario de datos + maestras/transaccionales | 3 |
| A5 | Diagrama de actores + justificación de permisos desde el negocio | 4 |
| A6 | BPMN del proceso central (inscripción → cursada → promoción) | 5 |
| A7 | Reglas de negocio en lenguaje del cliente + trazabilidad a Jira | 5 |
| A8 | 5 diagramas de estado | 6 |
| A9 | Fichas de reporte (quién / para qué decisión / qué datos) | 7 |

### Bloque B — Código (poco, pero bloqueante)

Rama: `fix/abm-completo-encuentros`.

| # | Tarea | Estado |
|---|---|---|
| B1 | Commitear migraciones 0010/0011, aplicarlas, cerrar `SCRUM-231`/`SCRUM-232` | ✅ Commiteado — ⚠️ falta aplicar en BD y cerrar issues |
| B2 | Corrección de asistencia ya registrada (modificación + baja) | ✅ Hecho — migración 0012 |
| B3 | Anulación/edición de pago | ✅ Hecho — migración 0013 |
| B4 | Decidir reportes para rol `administrativo` (implementar o justificar) | ⬜ Pendiente |
| B5 | ABM de `marketing_campaigns` — o cerrar `SCRUM-187` y eliminar el módulo | ⬜ Pendiente |
| B6 | Smoke test integral de todos los módulos antes de presentar | ⬜ Pendiente |

**Justificación de negocio de B2 y B3** (para el Encuentro 3 y el 6):

- *Asistencia* — una toma de lista mal cargada era incorregible: el sistema mostraba
  "Para corregir, comunicate con el administrador del sistema". Como la asistencia
  alimenta el umbral de promoción del 80%, un error de carga alteraba la condición
  académica del alumno sin vía de corrección. Ahora se corrige, y la corrección queda
  trazada con usuario y fecha (`updated_at` / `updated_by`).
- *Pagos* — se implementó **anulación, no eliminación**. Borrar un pago rompería la
  trazabilidad contable: el número de recibo quedaría huérfano. El pago anulado
  conserva el registro, sale de los totales y exige un motivo escrito. La edición
  solo se permite sobre pagos no cobrados, porque un pago abonado ya tiene un recibo
  entregado al alumno.

> Conviene abrir estas dos como historias del Sprint 9 con esa justificación, así el
> ABM queda completo **y** queda registro de que salió de un análisis, no de un parche.

**Justificación de los ABM que quedan incompletos a propósito** (respuesta lista para el docente):

| Entidad | Por qué no tiene ABM completo |
|---|---|
| `teacher_surveys` | Las encuestas son anónimas. Permitir editarlas o borrarlas selectivamente rompería la anonimidad, que es la condición que hace que el alumno responda con sinceridad. |
| `documents` | Un material se reemplaza subiendo la versión nueva y dando de baja la anterior; editar el archivo en su lugar dejaría el historial del curso inconsistente. |
| `assessments` | Las preguntas las genera la IA a partir del material del curso. Editarlas a mano rompería la relación entre la evaluación y su fuente; por eso se archiva y se genera de nuevo. |

### Bloque C — Gestión (SM/PO)

| # | Tarea |
|---|---|
| C1 | Cerrar Sprint 8 (vencido hace 26 días) y abrir Sprint 9 |
| C2 | Actas de daily meeting (aunque sean retroactivas y breves) |
| C3 | Retrospectivas con decisiones concretas por sprint |
| C4 | Métricas por sprint: comprometido vs. completado |
| C5 | Backlog clasificado: hecho / falta / Práctica III |
| C6 | Documentar la comunicación con el cliente — `SCRUM-191` es la evidencia clave |
| C7 | Plan de entrega a Práctica III |

---

## Los riesgos que hay que atacar primero

1. **La columna FN está casi vacía.** Es la que más pesa y la que menos tenemos. Todo el bloque A.
   → Avance: [encuentro-2-dominio.md](encuentro-2-dominio.md) ya cubre el Encuentro 2 completo.
2. **ABM incompleto en asistencia y pagos.** ✅ Resuelto (B2, B3).
3. **Reglas de negocio desactualizadas.** El sistema usa 80% de asistencia y escala 1–10;
   la Directora pidió 70% y 0–100% en mayo 2026 (`SCRUM-190`, `SCRUM-188`). El Encuentro 5
   pide defender cada regla desde el cliente. Son cambios chicos — hacerlos antes.
4. **El stack no es el del anteproyecto.** El relevamiento de Práctica I propuso
   C#/.NET/SQL Server/IIS y WhatsApp Business API; se construyó Next.js/TypeScript/
   PostgreSQL/Vercel y email. El Encuentro 1 pide "tecnologías elegidas y justificadas":
   hay que llevar esa justificación por escrito. Detalle en
   [encuentro-2-dominio.md](encuentro-2-dominio.md) §6.3.
5. **Errores internos en el documento de relevamiento.** Contradicciones entre sus propias
   secciones (2 vs 3 administrativas, 10 vs 20 docentes, ≥6 vs ≥7 en el flujograma de
   promoción, funciones del docente pegadas en las de la Directora). Corregirlas antes de
   volver a presentarlo — ver §6.4.
6. **Sprint 8 vencido y abierto.** Señal de gestión descuidada, cuesta 5 minutos arreglarla.
7. **Trabajo hecho sin commitear** con issues abiertos. ✅ Resuelto (B1).
