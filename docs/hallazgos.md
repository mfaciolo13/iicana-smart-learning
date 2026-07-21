# Hallazgos — backlog de tareas

Relevamiento consolidado del **21/07/2026**. Surge de cruzar el código real, el board
de Jira, el relevamiento institucional de Práctica I (oct/2025) y el relevamiento con
la Directora (may/2026) contra la hoja de ruta de los 7 encuentros.

Cada hallazgo está pensado para convertirse en un issue de Jira. Los que ya están
resueltos quedan registrados con su commit para no volver a analizarlos.

**Prioridad:** 🔴 bloqueante · 🟡 importante · 🟢 menor · ✅ resuelto

**Fuentes citadas:** `[REL-2025]` informe inicial de Práctica I · `[REL-2026]`
relevamiento con la Directora (`SCRUM-191`) · `[COD]` código del repositorio.

---

## A. Bloqueantes operativos

| ID | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| 🔴 **A-01** | Las migraciones `0012` y `0013` **no están aplicadas** en la base. El código compila pero falla en runtime. | `src/lib/drizzle/migrations/` | Aplicarlas. **Ojo:** la 0013 usa `ALTER TYPE ... ADD VALUE`, que en Postgres **no puede ejecutarse dentro de una transacción** — correrla suelta. |
| 🔴 **A-02** | El **Sprint 8 sigue `active`** con fecha de cierre 25/06/2026 — 26 días vencido. | Board SCRUM | Cerrarlo y abrir Sprint 9. Es lo primero que mira un docente al evaluar gestión. |
| 🟡 **A-03** | `SCRUM-231` y `SCRUM-232` están **resueltos en código pero abiertos en Jira**. | commit `44cb741` | Cerrarlos. Backlog desactualizado se lee como trabajo no hecho. |
| 🟡 **A-04** | Hubo **otra sesión de Claude commiteando en el mismo working tree**. El commit `a809818` dice "refactor de enrollments" pero contiene toda la feature de corrección de asistencia. | `git log` | Revisar el mensaje del commit. Evitar dos agentes sobre el mismo repo a la vez. |
| 🟡 **A-05** | **Smoke test integral pendiente.** El Encuentro 7 exige que "todo lo anterior siga funcionando en conjunto". | — | Recorrer los 4 portales antes de presentar. |

---

## B. Reglas de negocio desactualizadas

El Encuentro 5 pide *"FN: defiende cada regla de negocio desde el cliente"*. Estas
cuatro reglas vienen del relevamiento de 2025, la Directora las cambió en 2026, y el
código todavía tiene las viejas.

| ID | Regla | oct/2025 | may/2026 | Hoy | Issue |
|---|---|---|---|---|---|
| 🔴 **B-01** | Asistencia mínima para promover | 80% | **70%** | 80% ❌ | `SCRUM-190` |
| 🔴 **B-02** | Escala de calificación | 1–10 | **0–100%** | 1–10 ❌ | `SCRUM-188` |
| 🔴 **B-03** | Nota mínima para promover | 7/10 | **70/100** | 7,0 ❌ | `SCRUM-188` |
| 🟡 **B-04** | Métodos de pago | efectivo, transferencia | **+ débito y crédito** con descuento y recargo distintos | `cash, transfer, card` ❌ | `SCRUM-180` |

**B-01 a B-03 son cambios chicos** (dos constantes en `promotions.service.ts:5-6`, un
schema de Zod en `grades/schemas.ts:8-9`, una migración de datos `score × 10`) y
eliminan la única contradicción real entre el análisis y el código. Hacerlos antes del
Encuentro 5.

---

## C. Reglas del negocio relevadas que el sistema nunca modeló

Todas salen de las Políticas Institucionales y los flujogramas de `[REL-2025]`.

| ID | Regla del negocio | Estado | Riesgo en el coloquio |
|---|---|---|---|
| 🟡 **C-01** | **Lista de espera** cuando el curso llega a 15 | Sin modelar | Alto. Está en el flujograma de inscripción. Si preguntan *"¿qué pasa si el curso está lleno?"*, hoy la respuesta es "lo rechaza"; el negocio dice "va a lista de espera y se avisa cuando haya cupo" |
| 🟡 **C-02** | **Recursar el nivel con descuento** si el promedio es inferior al mínimo | Sin modelar | Medio. Un enrollment no promovido queda `active` o `withdrawn`, sin registro del recursado ni del descuento |
| 🟡 **C-03** | **Cambio de horario o grupo** dentro del mismo cuatrimestre | Sin modelar | Medio. Hoy hay que dar de baja e inscribir de nuevo, y se pierde la asistencia previa |
| 🟢 **C-04** | Descuento por adelantar el cuatrimestre completo (estrategia de fidelización) | Sin modelar | Bajo — `SCRUM-183` ya lo cubre como pendiente |
| 🟢 **C-05** | Matrícula al inscribir y cuota mensual por curso | Sin modelar | Bajo — `SCRUM-179` y `SCRUM-181` |
| 🟢 **C-06** | Facturación ARCA para pagos no-efectivo | Sin modelar | Bajo — `SCRUM-184`. Estaba **fuera de alcance** en el anteproyecto y el cliente lo pidió después |
| ✅ **C-07** | *"No se aceptan cheques"* | Cumplido implícitamente: el enum `payment_method` no lo incluye | — |

---

## D. ABM incompleto

El Encuentro 3 exige *"ABM completo de TODAS las entidades"* y la consigna dice
*"Dev: demuestra cada ABM ante pedido imprevisto del docente"*.

**Regla de decisión:** o se implementa, o se justifica desde el negocio. Las dos son
respuestas válidas; *"no existe"* no lo es.

### D.1 Resueltos

| ID | Entidad | Qué faltaba | Commit |
|---|---|---|---|
| ✅ **D-01** | `attendance` | Sin modificación ni baja. El sistema decía *"Para corregir, comunicate con el administrador del sistema"*. Crítico: la asistencia alimenta el umbral de promoción. | `d3a0786` + migración `0012` (traza `updated_at`/`updated_by`) |
| ✅ **D-02** | `payments` | Sin baja; sin editar monto ni vencimiento | `5af96a5` + migración `0013`. Se implementó **anulación, no eliminación**: borrar rompería la trazabilidad contable |

### D.2 Pendientes de implementar o justificar

| ID | Entidad | Falta | Recomendación |
|---|---|---|---|
| 🟡 **D-03** | `marketing_campaigns` | Sin baja ni modificación | **Decidir primero:** `SCRUM-187` pide eliminar el módulo entero. Si se elimina, este hallazgo desaparece |
| 🟡 **D-04** | `inquiries` | Sin baja. Además **no tiene listado propio** — solo aparece anidado en el detalle de campaña | Ídem D-03 |
| 🟡 **D-05** | `class_observations` | Sin baja ni modificación | Implementar. Una observación de clase mal cargada hoy es incorregible |
| 🟢 **D-06** | `complaints` | Sin baja | Justificable: un reclamo no se borra, se resuelve o se cierra. **Escribir la justificación** |
| 🟢 **D-07** | `notifications` | Sin baja ni descarte por el usuario | Justificable: es un registro de comunicación institucional. **Escribir la justificación** |

### D.3 Justificar por escrito (no implementar)

| ID | Entidad | Falta | Justificación de negocio |
|---|---|---|---|
| 🟡 **D-08** | `teacher_surveys` | Sin baja ni modificación | Son **anónimas**. Editarlas o borrarlas selectivamente rompería la anonimidad, que es la condición que hace que el alumno responda con sinceridad |
| 🟡 **D-09** | `documents` | Sin modificación (sí tiene baja) | Un material se reemplaza subiendo la versión nueva y dando de baja la anterior; editar el archivo en su lugar dejaría el historial del curso inconsistente |
| 🟡 **D-10** | `assessments` | Sin edición de contenido (sí archivar) | Las preguntas las genera la IA a partir del material del curso. Editarlas a mano rompería la relación entre la evaluación y su fuente |

---

## E. Riesgos técnicos y de código

| ID | Hallazgo | Evidencia | Acción |
|---|---|---|---|
| 🟡 **E-01** | **`Promise.all` con queries concurrentes de Drizzle.** El cliente está configurado con `max: 1` conexión, así que las queries concurrentes se serializan sobre una sola conexión y pueden colgarse. | `src/lib/drizzle/index.ts:7`. Sitios: `enrollments/actions.ts:43`, `courses/actions.ts:80`, `notifications.service.ts:180`, `administrativo/students/[id]/page.tsx:39`, `profesor/attendance/new/page.tsx:42` | Auditar los 5 sitios y pasarlos a `await` secuencial. Los `Promise.all` que usan el cliente **Supabase** (HTTP) son seguros — solo importan los de `db.*` |
| 🟢 **E-02** | **Server Actions huérfanas** sin ninguna UI que las invoque | `createComplaintAsProfesorAction`, `markAllAsReadAction`, `markOverduePaymentsAction` | Conectarlas a la UI o eliminarlas. Código muerto en una demo es una pregunta incómoda |
| 🟢 **E-03** | El detalle de pago del portal `administrativo` **enlaza al recibo bajo `/director/`** | `administrativo/payments/[id]/page.tsx` | Funciona (proxy no bloquea `/director/payments`), pero es inconsistente. Crear la ruta `administrativo/payments/[id]/receipt` |
| 🟢 **E-04** | Los endpoints de cron **saltean la verificación de `CRON_SECRET`** cuando `NODE_ENV === "development"` | `src/app/api/cron/*` | Aceptable en desarrollo, pero conviene tenerlo identificado si preguntan por seguridad |
| 🟢 **E-05** | 8 warnings de ESLint preexistentes (variables sin usar en tests E2E) | `tests/e2e/*` | Limpieza cosmética |

---

## F. Divergencias con el anteproyecto — Encuentro 1

El Encuentro 1 pide *"tecnologías elegidas **y justificadas**"*. El stack construido no
es el que propuso el anteproyecto de Práctica I.

| ID | Componente | Anteproyecto `[REL-2025]` | Implementado |
|---|---|---|---|
| 🔴 **F-01** | Frontend | ASP.NET con C# (y en otra sección, React/NextJS) | Next.js 16 + React 19 + TypeScript |
| 🔴 **F-02** | Backend | C# con .NET Framework, API REST | Server Actions de Next.js |
| 🔴 **F-03** | Base de datos | Microsoft SQL Server (y en otra sección, MySQL) | PostgreSQL (Supabase) |
| 🔴 **F-04** | Hosting | Servidor Windows con IIS | Vercel |
| 🟡 **F-05** | IA | Servicio Python con modelo de ML entrenado con datos históricos | Claude API (`@anthropic-ai/sdk`) |
| 🟡 **F-06** | Notificaciones | WhatsApp Business API | Email (Resend) + notificación interna |
| 🟡 **F-07** | **RF-17 Chatbot "SmartEnglish"** de práctica de inglés | Contemplado | **No implementado** → backlog honesto del Encuentro 7 |
| 🟡 **F-08** | **Rol Tutor** | RF-14 lo lista; el alcance incluye *"portal web para alumnos y tutores"* | **No implementado** → presentar como reducción de alcance consciente, no como algo nunca pedido |
| 🟢 **F-09** | Facturación AFIP/ARCA | **Fuera de alcance Fase 1** | El cliente la pidió después (`SCRUM-184`) → ampliación de alcance |
| 🟢 **F-10** | Actor **contadora externa** | Actor real del negocio (concilia ingresos, cierre contable) | Sin rol en el sistema → candidato a Práctica III |

**Tarea F-00:** redactar la justificación escrita del cambio de stack. Argumentos
defendibles: un stack unificado en TypeScript reduce la superficie a mantener por un
equipo de 4; Vercel + Supabase eliminan la administración de servidor que el
anteproyecto asumía; **usar un modelo de lenguaje ya entrenado evita necesitar el
dataset histórico que el instituto no tiene — justamente porque no había sistema**;
WhatsApp Business API requiere aprobación de Meta y costo por mensaje, mientras el
email cubre el mismo requisito de trazabilidad.

---

## G. Errores internos del documento de relevamiento `[REL-2025]`

Detectados al cruzar sus propias secciones. Un docente que lea con atención los
encuentra. Corregir antes de volver a presentarlo.

| ID | Dónde | Problema |
|---|---|---|
| 🟡 **G-01** | Funciones de la Directora (p. 12) | Incluye *"dictado de clases"*, *"carga de notas"* y *"preparación de materiales didácticos"* — son funciones del docente, quedaron pegadas por error |
| 🟡 **G-02** | Personal administrativo | El título dice **2 personas**; Recursos Humanos dice **3 administrativas**; el organigrama muestra **3 secretarios** |
| 🟡 **G-03** | Docentes | El título dice **20 docentes part-time**; Recursos Humanos dice **10 profesores** |
| 🔴 **G-04** | Flujograma de promoción (p. 40) | La condición dice *"Promedio mayor o igual a **6**"*; todo el resto del documento dice **≥ 7** |
| 🟢 **G-05** | Historia | Dice *"nacido en 1963"*; la conclusión habla de **65 años** (serían 62 a 2025) |
| 🔴 **G-06** | Proceso 2 vs RF-04 | El proceso dice que **el administrativo** pasa lista; la situación deseada y el RF-04 dicen que la toma **el docente**. El sistema hoy lo permite a los tres roles | 

**G-06 no es un error de tipeo sino una definición faltante.** Hay que decidir quién
toma asistencia y tener una sola respuesta.

---

## H. Documentación de análisis pendiente (columna FN)

Es el grueso del trabajo restante. Detalle y estado en
[plan-encuentros.md](plan-encuentros.md).

| ID | Entregable | Encuentro | Estado |
|---|---|---|---|
| ✅ **H-01** | Procesos del negocio, actores y justificación del DER | 2 | [encuentro-2-dominio.md](encuentro-2-dominio.md) |
| 🔴 **H-02** | Story Map + template de User Story | 2 | Pendiente |
| 🔴 **H-03** | Casos de uso + diccionario de datos + maestras/transaccionales | 3 | Pendiente |
| 🔴 **H-04** | Diagrama de actores + justificación de permisos desde el negocio | 4 | Parcial (§2 de H-01) |
| 🔴 **H-05** | BPMN del proceso central | 5 | Pendiente |
| 🔴 **H-06** | Reglas de negocio en lenguaje del cliente + trazabilidad a Jira | 5 | Parcial (§3 de H-01) |
| 🔴 **H-07** | 5 diagramas de estado | 6 | Pendiente |
| 🟡 **H-08** | Revisar y actualizar `encuentro-6-casos-borde.docx` | 6 | Existe, sin revisar |
| 🔴 **H-09** | Fichas de reporte: quién lo pide, para qué decisión, con qué datos | 7 | Pendiente |
| 🔴 **H-10** | Plan de entrega a Práctica III | 7 | Pendiente |

**Gestión (SM/PO):** actas de daily, retrospectivas con decisiones concretas, métricas
por sprint (comprometido vs. completado) y backlog clasificado en hecho / falta /
Práctica III.

---

## I. Decisiones que requieren al cliente o al equipo

Ninguna se puede resolver desde el código. Llevarlas a la próxima reunión.

| ID | Pregunta | Bloquea |
|---|---|---|
| 🔴 **I-01** | ¿Quién toma asistencia: el docente o el administrativo? | G-06, Encuentro 4 |
| 🔴 **I-02** | Porcentajes exactos de descuento por efectivo, por transferencia/débito y recargo por crédito | B-04, `SCRUM-180` |
| 🟡 **I-03** | Monto de matrícula por curso, ¿varía según nivel? | C-05, `SCRUM-181` |
| 🟡 **I-04** | ¿Se modela la lista de espera cuando el curso llega a 15? | C-01 |
| 🟡 **I-05** | ¿Se modela el recursado con descuento? | C-02 |
| 🟡 **I-06** | El alumno suspendido por mora que regulariza, ¿vuelve automáticamente a `active` o requiere decisión de Dirección? | Diagrama de estado H-07 |
| 🟡 **I-07** | ¿La contadora externa necesita acceso propio, o alcanza con los reportes que le pasa la Dirección? | F-10 |
| 🟡 **I-08** | Los 3 reportes Excel son **solo `director`**. ¿Se le habilita alguno al rol `administrativo` o se justifica la exclusión? | Encuentro 7 |
| 🟡 **I-09** | ¿Se elimina el módulo de Marketing (`SCRUM-187`) o se le completa el ABM? | D-03, D-04 |

---

## Resumen por prioridad

**🔴 Hacer antes del próximo encuentro (11):**
A-01 aplicar migraciones · A-02 cerrar Sprint 8 · B-01/B-02/B-03 actualizar umbrales y
escala · F-00 justificar el stack · G-04 y G-06 corregir el relevamiento · H-02 a H-07
y H-09/H-10 documentación de análisis · I-01 y I-02 preguntas al cliente.

**🟡 Importante (18):** A-03 a A-05 · B-04 · C-01 a C-03 · D-03 a D-05, D-08 a D-10 ·
E-01 · F-05 a F-08 · G-01 a G-03 · H-08 · I-03 a I-09.

**🟢 Menor (11):** C-04 a C-06 · D-06, D-07 · E-02 a E-05 · F-09, F-10 · G-05.

**✅ Resueltos (4):** C-07 · D-01, D-02 · H-01.
