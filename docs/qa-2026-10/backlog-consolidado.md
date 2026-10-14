# Backlog consolidado — campaña QA y pulido (octubre 2026)

Fecha: 13/10/2026 · Autor: Product Owner · Proyecto Jira: `SCRUM` · Rama `main` @ `5207074`

Fuentes, todas en `docs/qa-2026-10/`:
- [qa1-director-administrativo.md](qa1-director-administrativo.md): 24 QA1 más REF-01.
- [qa2-profesor-alumno-e2e.md](qa2-profesor-alumno-e2e.md): 16 QA2.
- [ba-trazabilidad-requisitos.md](ba-trazabilidad-requisitos.md): 32 BA.
- [dev-auditoria-tecnica.md](dev-auditoria-tecnica.md): 47 DEV y la §4 de causa raíz.
- [po-jira-y-producto.md](po-jira-y-producto.md): 17 PO.
- [INCIDENTE-2026-10-13.md](INCIDENTE-2026-10-13.md).

> **Jira no se tocó.** Este documento es la propuesta para cargar después de revisarla. Se consultó Jira (solo lectura) para deduplicar: no hubo cambios en el proyecto desde la fase 1.
>
> **Antes de cualquier otra cosa:** hay una alumna real borrada en producción (`CAMP-001`). Su restauración la decide el responsable del proyecto. Además, hay dos vulnerabilidades críticas explotables hoy (`CAMP-002`, `CAMP-003`), y la base de dev y de test es la de producción (`CAMP-004`). Hasta cerrar `CAMP-004` no se hacen pruebas de escritura.

**Criterios de priorización.**
- **Prioridad de Jira:** sale de la severidad. Crítica → Highest, Alta → High, Media → Medium, Baja → Low. Las historias se ubican según el valor para el instituto y para la defensa.
- **MoSCoW:** sale del sprint asignado. Sprints 10 a 12 → Must, 13 → Should, Backlog → Could. Se lleva como label (`must`, `should`, `could`).
- **Won't:** solo SCRUM-255, si se confirma ocultar Marketing (CAMP-033).

**Convenciones:** las de [po-jira-y-producto.md §4](po-jira-y-producto.md):
- Títulos con la forma `[Severidad] Portal/Módulo: síntoma`.
- Label `qa-2026-10` en todo ítem de la campaña, más los labels `origen-*` y `mod-*`.
- Label `bloqueado-cliente` para lo que espera una respuesta de la Directora, y `bloqueado-decision` para lo que espera una decisión del responsable del proyecto.


## 1. Resumen ejecutivo

- **75 tickets nuevos a crear** (`CAMP-001` a `CAMP-075`) y **32 tickets existentes que se reusan** (se actualizan alcance, prioridad, épica, labels y sprint; no se duplican).
- **5 épicas nuevas** (E1, E3, E4, E6, E7) y **2 existentes reusadas** como épica: SCRUM-191 (E2) y SCRUM-194 (E5).
- **11 tickets nuevos bloqueados** por una decisión (cliente o responsable). Las 15 preguntas al cliente se resuelven en una sola reunión (`CAMP-010`, Sprint 10).
- Fuentes consolidadas: 25 QA1 (24 + REF-01), 16 QA2, 32 BA, 47 DEV, 17 PO y el incidente del 13/10 → **107 ítems de trabajo** en total.

### 1.1 Tickets nuevos por severidad (prioridad Jira)

| Prioridad Jira | Severidad | Nuevos | Existentes reusados | Total |
|---|---|--:|--:|--:|
| Highest | Crítica | 5 | 0 | 5 |
| High | Alta | 15 | 15 | 30 |
| Medium | Media | 34 | 10 | 44 |
| Low | Baja | 21 | 7 | 28 |
| **Total** | | **75** | **32** | **107** |

### 1.2 Por tipo

| Tipo | Nuevos |
|---|--:|
| Bug | 40 |
| Historia | 24 |
| Tarea | 11 |

### 1.3 Por épica

| Épica | Nuevos | Existentes reusados | SP estimados |
|---|--:|--:|--:|
| E1 · QA-2026-10 · Seguridad y datos de producción (nueva) | 12 | 4 | 62 |
| E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) | 12 | 6 | 62 |
| E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) | 10 | 1 | 34 |
| E4 · QA-2026-10 · Integridad de datos y formularios (nueva) | 9 | 8 | 44 |
| E5 · UX y experiencia por rol (SCRUM-194) | 23 | 8 | 96 |
| E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) | 6 | 2 | 25 |
| E7 · QA-2026-10 · Defensa y documentación (nueva) | 3 | 0 | 10 |
| SCRUM-178 · Rediseño de pagos (existente, fuera de la campaña) | 0 | 3 | 13 |

### 1.4 Por sprint

| Sprint | MoSCoW | Nuevos | Existentes | SP estimados |
|---|---|--:|--:|--:|
| 10 | Must | 11 | 4 | 37 |
| 11 | Must | 10 | 11 | 67 |
| 12 | Must | 14 | 4 | 63 |
| 13 | Should | 13 | 5 | 65 |
| Backlog | Could | 27 | 8 | 114 |

SP estimados a partir del esfuerzo del Dev: S = 2, S-M = 3, M = 5. Para los ítems de BA y PO el esfuerzo es estimación del PO.

### 1.5 Top 10

| # | Ítem | Por qué está arriba |
|--:|---|---|
| 1 | **CAMP-001** · Restaurar la alumna real borrada y su pago | Pérdida de datos reales y contables en producción. Depende de una decisión del responsable (backup/PITR o reinsert) |
| 2 | **CAMP-002** · El link de invitación entra a cualquier cuenta (DEV-001) | Toma de la cuenta del director sin credenciales, hoy, en producción |
| 3 | **CAMP-003** · Cualquier usuario se da el rol director (DEV-002) | Escalada de privilegios con la API pública. La mitigación (signups off, REVOKE) no requiere código |
| 4 | **CAMP-004** · Producción, dev y tests comparten base (DEV-005) | Causa de infraestructura del incidente. Mientras no se cierre, ninguna prueba de escritura es segura |
| 5 | **CAMP-005** · La app se cuelga con dos consultas a la vez (DEV-047) | Fix de una línea que destraba el dev server y evita timeouts en Vercel. Sin él no se puede ni testear ni demostrar |
| 6 | **CAMP-007** · El personal no ve ningún reclamo (QA2-013) | Un flujo completo roto en silencio. Fix S |
| 7 | **SCRUM-236** (+ SCRUM-252, SCRUM-235) · No se puede crear un curso ni un alumno sin nivel (QA1-014, QA1-015) | Dos altas core bloqueadas sin feedback. Mismo patrón y fix S |
| 8 | **CAMP-008** · El buscador de alumnos no filtra (QA1-024) | Causa directa del incidente: el usuario opera sobre la fila equivocada |
| 9 | **CAMP-012** · Cualquier autenticado lee pagos, DNI y notas de todos (DEV-003) | Exposición de datos personales (privacidad) y desanonimización de encuestas |
| 10 | **CAMP-016** · Borrar un alumno se lleva sus pagos (DEV-019 / QA1-023 / BA-005) | Contradice la trazabilidad contable (D-02) y fue el mecanismo del incidente |

Inmediatamente después vienen **SCRUM-242** (la edición "guarda" sin guardar, el otro componente del incidente) y **SCRUM-188 / SCRUM-190** (las reglas 0–100 y 70% de la Directora, que son la pregunta más probable del tribunal).


## 2. Deduplicación

Un ítem por defecto real. La columna *Orígenes* lista todos los IDs que describen ese mismo defecto; *Jira* indica el ticket existente que se reusa o con el que se vincula.

### 2.1 Tickets existentes que se reusan

| Ticket | Defecto | Orígenes que absorbe | Sprint |
|---|---|---|---|
| SCRUM-236 | No se puede crear un curso | QA1-014, BUG-D, SCRUM-93 (regresión) | 10 |
| SCRUM-252 | No se puede desasignar el docente | QA1-014 (docente), DEV-045 ("" → null) | 10 |
| SCRUM-235 | Alta de alumno bloqueada si no se elige nivel | QA1-015, BUG-C | 10 |
| SCRUM-241 | Comunicaciones: opción role:admin | QA2-007 | 10 |
| SCRUM-242 | Editar nombre/teléfono no persiste | DEV-017, INCIDENTE (éxito falso) | 11 |
| SCRUM-243 | placementTestScore nunca se guarda | DEV-018, QA1-015 (puntaje) | 11 |
| SCRUM-188 | Escala de notas 0-100 | BA-001, QA1 (re-verificado) | 11 |
| SCRUM-190 | Asistencia mínima 70% | BA-002, QA1 (re-verificado) | 11 |
| SCRUM-248 | Promoción sin revalidar elegibilidad | BA-003, DEV-036 | 11 |
| SCRUM-244 | Reactivar inscripción saltea cupo | BA-006, DEV-020 | 11 |
| SCRUM-249 | markAsPaid resucita pagos anulados | BA-013, DEV-030 | 11 |
| SCRUM-245 | Reportes Excel: 403 para administrativo | DEV-024, PO-008, I-08 | 11 |
| SCRUM-246 | IDOR: profesor carga notas ajenas | DEV-010, BA-010, QA2-004 (notas) | 11 |
| SCRUM-247 | Director se auto-desactiva | DEV-023, BA-027 | 12 |
| SCRUM-251 | Autoevaluación sin guard de intento duplicado | DEV-013, QA2-010 (quiz ajeno) | 12 |
| SCRUM-250 | Encuesta "anónima" guarda enrollmentId | BA-025, QA2-009 | 12 |
| SCRUM-260 | Fechas con un día de menos | QA2-012, DEV-032, PO-003 | 11 |
| SCRUM-253 | Administrativo cae en /director | QA1-020, QA2-002, DEV-045 (redirectTo), DEV-022 (GradeList), E-03 | 12 |
| SCRUM-234 | Borrar desde el detalle → 404 | BUG-A, QA1 (re-verificado) | 11 |
| SCRUM-240 | Validaciones de fecha faltantes | DEV-037 (fechas), BA-011 (fecha futura) | 13 |
| SCRUM-254 | Estado de reclamo no revalida el detalle | QA2-013 (extras) | 13 |
| SCRUM-256 | QuizPlayer ignora el error del envío | DEV-045 (QuizPlayer) | 13 |
| SCRUM-257 | Forms de estado sin toast de éxito | — | Backlog |
| SCRUM-258 | Validaciones menores | — | Backlog |
| SCRUM-237 | Warning `error` en elementos DOM | DEV-043, QA1/QA2 (re-verificado) | Backlog |
| SCRUM-259 | Código obsoleto/muerto | DEV-046 | Backlog |
| SCRUM-139 | Tablas → cards en mobile | QA1-019 | 13 |
| SCRUM-189 | Material de estudio en cursos | QA2-006, DEV-040 (material), Q-06 | 13 |
| SCRUM-233 | Lista de espera | BA-020 | Backlog |
| SCRUM-180 | Métodos de pago con descuentos | BA-004 | Backlog |
| SCRUM-181 | Matrícula en inscripciones | BA-018 | Backlog |
| SCRUM-179 | Cuota mensual por curso | BA-018 | Backlog |

### 2.2 Tickets nuevos

| CAMP | Defecto / historia | Orígenes | Jira relacionado |
|---|---|---|---|
| CAMP-001 | [Crítica] Director/Alumnos: restaurar la alumna real borrada durante el QA y su pago | INCIDENTE-2026-10-13, QA1-023 | — |
| CAMP-002 | [Crítica] Todos/Auth: el link de invitación permite entrar a cualquier cuenta, incluida la del director | DEV-001, QA1-REF-01 | — |
| CAMP-003 | [Crítica] Todos/Auth: cualquier usuario puede darse el rol director (RLS de profiles y registro público abierto) | DEV-002, SCRUM-259 (registerAction) | SCRUM-259 |
| CAMP-004 | [Crítica] Infra: producción, dev y tests E2E comparten el mismo proyecto Supabase y la misma base | DEV-005, INCIDENTE-2026-10-13 (preventiva 1), BA-032 (entorno), SCRUM-239, SCRUM-155 | SCRUM-239, SCRUM-155, SCRUM-156 |
| CAMP-005 | [Alta] Todos: la app se cuelga cuando llegan dos consultas a la vez (conexión de Drizzle bloqueada) | DEV-047, QA2-011, QA1-016 (cuelgue), PO-014 (parte técnica), DEV-042, E-01 (hallazgos.md) | — |
| CAMP-006 | [Alta] API/Crons: los endpoints de cron se pueden disparar sin secreto (en dev siempre; en prod si falta CRON_SECRET) | DEV-028, QA1-009, E-04 (hallazgos.md) | SCRUM-219 |
| CAMP-007 | [Crítica] Director/Administrativo/Reclamos: el personal no ve ningún reclamo (el flujo de reclamos está roto) | QA2-013 | SCRUM-254 |
| CAMP-008 | [Alta] Director/Administrativo/Alumnos: el buscador no filtra al escribir y se opera sobre la fila equivocada | QA1-024, INCIDENTE-2026-10-13 (causa) | — |
| CAMP-009 | [Media] Todos/Auth: "Cerrar sesión" cierra la sesión en todos los dispositivos | QA1-022 | — |
| CAMP-010 | [Alta] Gestión: relevar con la Directora las decisiones que bloquean historias (I-01..I-09, Q-01..Q-06) | BA §8, hallazgos.md §I, PO-005 | SCRUM-180, SCRUM-181, SCRUM-187, SCRUM-233 |
| CAMP-011 | [Media] Gestión: cerrar el Sprint 9 vencido, registrar la retrospectiva y actualizar las métricas | PO-016 | — |
| CAMP-012 | [Alta] Todos/Datos: cualquier usuario autenticado puede leer pagos, DNI, notas y asistencia de todos (RLS USING true) | DEV-003, QA2-009 (lectura de enrollment_id), BA-025 (parte) | SCRUM-250 |
| CAMP-013 | [Alta] Administrativo: el acceso a secciones de dirección depende de user_metadata y las páginas no revalidan el rol | DEV-004, QA1-004, QA1-005 | SCRUM-253 |
| CAMP-014 | [Alta] Profesor: puede tomar, corregir o borrar asistencia y publicar o generar autoevaluaciones de cursos ajenos | DEV-011, DEV-015, QA2-004, QA2-005, BA-011 (propiedad) | SCRUM-246 |
| CAMP-015 | [Alta] Alumno/Evaluación docente: se puede votar en cursos ajenos, votar infinitas veces y bloquear la encuesta de otro | DEV-012, QA2-010 (encuesta) | SCRUM-250 |
| CAMP-016 | [Alta] Director/Administrativo/Alumnos: borrar un alumno elimina en cascada sus pagos y deja su cuenta habilitada | DEV-019, QA1-023, BA-005, INCIDENTE-2026-10-13 (preventivas 2 y 3) | SCRUM-234 |
| CAMP-017 | [Alta] Director/Docentes/Alumnos: las listas cacheadas muestran datos viejos (informe docente 404, conteos que no coinciden) | DEV-039, QA2-015, QA1-002 | — |
| CAMP-018 | [Alta] Director/Reportes y Cierre de ciclo: los cálculos se cortan en 1000 filas y no coinciden con lo que se consolida | DEV-033 | — |
| CAMP-019 | [Alta] Pagos/Automatizaciones: ningún proceso automático pasa las cuotas vencidas a "Vencida" | DEV-025, BA-007 (a), QA2-014 (observación) | SCRUM-207, SCRUM-209, SCRUM-206 |
| CAMP-020 | [Media] Director/Administrativo/Pagos: los contadores Pendientes/Vencidos/Pagados no suman el total y cada pantalla dice otra cosa | QA1-003, QA2-014 (estado) | — |
| CAMP-021 | [Media] Promociones: el redondeo permite promover con 79,5% de asistencia o 6,95 de promedio | DEV-034, BA-002 (redondeo) | SCRUM-190 |
| CAMP-022 | [Media] Todos: los errores de permisos o de base muestran la pantalla de error genérica y los formularios quedan colgados sin aviso | DEV-022, QA1-016 (feedback), PO-014 | — |
| CAMP-023 | [Media] Pagos/Alertas: la alerta al alumno y la alerta de mora a Dirección comparten la marca y una anula a la otra | DEV-026, BA-007 (b) | SCRUM-207 |
| CAMP-024 | [Media] Pagos: las cuotas suspendidas (más de 30 días de mora) no se pueden cobrar y desaparecen de la deuda | DEV-029, BA-009 (parte 1) | — |
| CAMP-025 | [Media] Director/Cursos: el cupo seleccionado no se ve (botón blanco sobre blanco) | QA1-001 | SCRUM-236 |
| CAMP-026 | Administrativo/Pagos: generar las cuotas del mes en un solo paso | PO-006, BA-018 (MVP) | SCRUM-179, SCRUM-181 |
| CAMP-027 | [Media] Alumno: el panel muestra las cuotas vencidas como "pendientes", con fecha ISO y sin formato de moneda | QA2-014 | — |
| CAMP-028 | Alumno: ver en el panel si voy a promocionar | PO-013 | SCRUM-188, SCRUM-190 |
| CAMP-029 | Profesor: ver en el panel la clase de hoy y los alumnos a seguir | PO-010 | — |
| CAMP-030 | Profesor/Asistencia: ir directo a tomar lista de la clase de hoy | PO-011 | — |
| CAMP-031 | Director: dashboard que muestre lo que hay que resolver hoy | PO-002 | — |
| CAMP-032 | Alumno: ver y descargar mis recibos y certificados | BA-016, E-03 (hallazgos.md) | — |
| CAMP-033 | Marketing: definir con la Directora si se oculta el módulo y actuar en consecuencia | PO-005, I-09 | SCRUM-187, SCRUM-255 |
| CAMP-034 | Defensa: datos de demo realistas en el entorno de test y guion de demo por rol | PO-015 | — |
| CAMP-035 | Documentación: alinear CLAUDE.md, encuentros y presentación con el producto y las reglas vigentes | BA-030, BA-031, PO-017 | — |
| CAMP-036 | [Media] Alumno/Autoevaluaciones: las respuestas correctas viajan al navegador antes de responder | DEV-014, QA2-010 (respuestas) | SCRUM-251 |
| CAMP-037 | [Media] Material y Perfil: los archivos subidos aceptan cualquier tipo declarado por el cliente y quedan huérfanos | DEV-040 (uploads), QA1-017 | SCRUM-189 |
| CAMP-038 | [Media] Infra: la app no envía headers de seguridad (CSP, anti-clickjacking, nosniff, Referrer-Policy) | DEV-007 | — |
| CAMP-039 | [Media] Pagos/Alertas: los fallos de envío de email se marcan como enviados y la UI informa éxito | DEV-027 | SCRUM-218, SCRUM-219, SCRUM-220 |
| CAMP-040 | [Media] Mora: la restricción por 2 cuotas no cuenta las suspendidas, no se levanta al pagar y las acciones del alumno siguen funcionando | DEV-031, BA-008, QA2-014 (observación) | SCRUM-209 |
| CAMP-041 | [Media] Riesgo de abandono: la intervención registrada se pierde en la corrida siguiente y la tendencia cuenta doble | DEV-038 | SCRUM-214 |
| CAMP-042 | [Media] Asistencia: el doble envío dispara alertas e IA dos veces y el estado de cada alumno no se valida | DEV-037, SCRUM-258 (asistencia) | SCRUM-232, SCRUM-240, SCRUM-258 |
| CAMP-043 | Director/Asistencia: definir quién toma lista y advertir si la fecha no es día de clase | BA-011, G-06/I-01 (hallazgos.md) | — |
| CAMP-044 | Director/Cierre de ciclo: cerrar un ciclo lectivo concreto, con egreso bien definido y sin efectos dobles | BA-014, DEV-035, SCRUM-259 (egreso) | SCRUM-259 |
| CAMP-045 | [Media] Alertas: el aviso de asistencia baja y el riesgo usan umbrales distintos de la regla de promoción | BA-019 | SCRUM-210, SCRUM-190 |
| CAMP-046 | Reclamos: respuesta al alumno, aviso de cambio de estado y acceso desde el menú | QA2-013 (extras), BA-015, PO-012 (reclamo del docente), E-02 | SCRUM-254, SCRUM-257 |
| CAMP-047 | [Media] Profesor/Asistencia: en el celular los nombres de los alumnos quedan cortados al tomar lista | QA2-016 | SCRUM-139 |
| CAMP-048 | Todos: vocabulario único y en español en menús, niveles, mensajes y controles | BA-029, QA1-008, QA1-012, QA2-001, QA2-008, DEV-046 (LEVEL_LABELS) | — |
| CAMP-049 | [Baja] Auth: los links de reset e invitación se arman con headers del request | DEV-009 | — |
| CAMP-050 | [Media] Infra: la conexión a Postgres no valida el certificado TLS y migraciones y runtime usan la misma URL | DEV-008 | SCRUM-123 |
| CAMP-051 | [Media] Infra: las funciones corren en EE.UU. Este y la base está en EE.UU. Oeste, lejos de Córdoba | DEV-006, BA-032 (latencia) | — |
| CAMP-052 | [Media] Autoevaluaciones IA: la generación no tiene cuota ni timeout, no valida el JSON y bloquea la toma de asistencia | DEV-016 | — |
| CAMP-053 | [Media] Rendimiento: medir y asegurar tiempos de respuesta con 5 usuarios concurrentes | BA-032 | — |
| CAMP-054 | [Baja] Crons/Notificaciones: envíos duplicados y la opción "Horas de anticipación" no tiene efecto | DEV-041, QA1-010 | SCRUM-221 |
| CAMP-055 | Administrativo/Pagos: reactivar al alumno que regulariza su deuda | BA-009 | — |
| CAMP-056 | [Baja] Inscripciones: se puede inscribir a un alumno suspendido o en un curso cerrado | DEV-021, BA-012 | — |
| CAMP-057 | Pagos: controlar en el servidor el vencimiento el día 10 | BA-017, SCRUM-240 (V3) | SCRUM-240 |
| CAMP-058 | Administrativo/Alertas: avisar a administración y al docente cuando un alumno falta 2 veces seguidas | BA-022, PO-009 (ausentes) | — |
| CAMP-059 | [Baja] Validaciones y redirecciones menores en varios módulos | DEV-045 | SCRUM-252, SCRUM-253 |
| CAMP-060 | [Baja] Emails: caracteres cirílicos en los textos y HTML sin escapar | DEV-044 | — |
| CAMP-061 | [Baja] Director/Cursos: hay cursos con cupo 20 y editarlos baja el cupo a 15 sin avisar | QA1-021 | — |
| CAMP-062 | Director: menú agrupado por secciones y con nombres que no se confundan | PO-001 | — |
| CAMP-063 | [Baja] Textos: plurales y espacios mal armados en varias pantallas | QA1-006, QA1-007, QA2-003 | — |
| CAMP-064 | [Baja] Director/Reportes: porcentajes y fechas del Excel salen como texto y los formatos se mezclan | QA1-011 | — |
| CAMP-065 | [Baja] Auth: mensajes de requerido genéricos, 403 sin branding y link de invitación malformado con error crudo | QA1-018 | — |
| CAMP-066 | Administrativo: consultar cursos, horarios y vacantes antes de inscribir | PO-007 | — |
| CAMP-067 | Director/Administrativo: paginación y filtros en los listados | PO-004, DEV-046 (sin paginación) | — |
| CAMP-068 | Administrativo: dashboard con la agenda del día | PO-009 | — |
| CAMP-069 | Profesor: enviar un aviso a los alumnos de mi curso | PO-012 | — |
| CAMP-070 | Director/Evaluación docente: corregir observaciones de clase y ver el cumplimiento del cuatrimestre | BA-026, D-05 (hallazgos.md) | — |
| CAMP-071 | Notas: promedio ponderado por tipo de evaluación | BA-023 | — |
| CAMP-072 | Cursos: aulas y franja horaria del instituto | BA-024 | — |
| CAMP-073 | Inscripciones: recursado con descuento y cambio de grupo | BA-021, C-02/C-03 (hallazgos.md) | — |
| CAMP-074 | Alumnos: historial académico unificado en la ficha | BA-028 | — |
| CAMP-075 | Todos: un patrón único de cabeceras, botones de formulario y acciones de fila | QA1-013 | — |

### 2.3 Índice de cobertura (origen → ítem)

Los 137 hallazgos de origen quedan cubiertos por al menos un ítem. No queda ningún hallazgo sin ítem.

**QA #1:** QA1-REF-01 → CAMP-002 · QA1-001 → CAMP-025 · QA1-002 → CAMP-017 · QA1-003 → CAMP-020 · QA1-004 → CAMP-013 · QA1-005 → CAMP-013 · QA1-006 → CAMP-063 · QA1-007 → CAMP-063 · QA1-008 → CAMP-048 · QA1-009 → CAMP-006 · QA1-010 → CAMP-054 · QA1-011 → CAMP-064 · QA1-012 → CAMP-048 · QA1-013 → CAMP-075 · QA1-014 → SCRUM-236, SCRUM-252 · QA1-015 → SCRUM-235, SCRUM-243 · QA1-016 → CAMP-005, CAMP-022 · QA1-017 → CAMP-037 · QA1-018 → CAMP-065 · QA1-019 → SCRUM-139 · QA1-020 → SCRUM-253 · QA1-021 → CAMP-061 · QA1-022 → CAMP-009 · QA1-023 → CAMP-001, CAMP-016 · QA1-024 → CAMP-008

**QA #2:** QA2-001 → CAMP-048 · QA2-002 → SCRUM-253 · QA2-003 → CAMP-063 · QA2-004 → CAMP-014, SCRUM-246 · QA2-005 → CAMP-014 · QA2-006 → SCRUM-189 · QA2-007 → SCRUM-241 · QA2-008 → CAMP-048 · QA2-009 → CAMP-012, SCRUM-250 · QA2-010 → CAMP-015, CAMP-036, SCRUM-251 · QA2-011 → CAMP-005 · QA2-012 → SCRUM-260 · QA2-013 → CAMP-007, CAMP-046, SCRUM-254 · QA2-014 → CAMP-019, CAMP-020, CAMP-027, CAMP-040 · QA2-015 → CAMP-017 · QA2-016 → CAMP-047

**BA:** BA-001 → SCRUM-188 · BA-002 → CAMP-021, SCRUM-190 · BA-003 → SCRUM-248 · BA-004 → SCRUM-180 · BA-005 → CAMP-016 · BA-006 → SCRUM-244 · BA-007 → CAMP-019, CAMP-023 · BA-008 → CAMP-040 · BA-009 → CAMP-024, CAMP-055 · BA-010 → SCRUM-246 · BA-011 → CAMP-014, CAMP-043, SCRUM-240 · BA-012 → CAMP-056 · BA-013 → SCRUM-249 · BA-014 → CAMP-044 · BA-015 → CAMP-046 · BA-016 → CAMP-032 · BA-017 → CAMP-057 · BA-018 → CAMP-026, SCRUM-179, SCRUM-181 · BA-019 → CAMP-045 · BA-020 → SCRUM-233 · BA-021 → CAMP-073 · BA-022 → CAMP-058 · BA-023 → CAMP-071 · BA-024 → CAMP-072 · BA-025 → CAMP-012, SCRUM-250 · BA-026 → CAMP-070 · BA-027 → SCRUM-247 · BA-028 → CAMP-074 · BA-029 → CAMP-048 · BA-030 → CAMP-035 · BA-031 → CAMP-035 · BA-032 → CAMP-004, CAMP-051, CAMP-053

**Dev:** DEV-001 → CAMP-002 · DEV-002 → CAMP-003 · DEV-003 → CAMP-012 · DEV-004 → CAMP-013 · DEV-005 → CAMP-004 · DEV-006 → CAMP-051 · DEV-007 → CAMP-038 · DEV-008 → CAMP-050 · DEV-009 → CAMP-049 · DEV-010 → SCRUM-246 · DEV-011 → CAMP-014 · DEV-012 → CAMP-015 · DEV-013 → SCRUM-251 · DEV-014 → CAMP-036 · DEV-015 → CAMP-014 · DEV-016 → CAMP-052 · DEV-017 → SCRUM-242 · DEV-018 → SCRUM-243 · DEV-019 → CAMP-016 · DEV-020 → SCRUM-244 · DEV-021 → CAMP-056 · DEV-022 → CAMP-022, SCRUM-253 · DEV-023 → SCRUM-247 · DEV-024 → SCRUM-245 · DEV-025 → CAMP-019 · DEV-026 → CAMP-023 · DEV-027 → CAMP-039 · DEV-028 → CAMP-006 · DEV-029 → CAMP-024 · DEV-030 → SCRUM-249 · DEV-031 → CAMP-040 · DEV-032 → SCRUM-260 · DEV-033 → CAMP-018 · DEV-034 → CAMP-021 · DEV-035 → CAMP-044 · DEV-036 → SCRUM-248 · DEV-037 → CAMP-042, SCRUM-240 · DEV-038 → CAMP-041 · DEV-039 → CAMP-017 · DEV-040 → CAMP-037, SCRUM-189 · DEV-041 → CAMP-054 · DEV-042 → CAMP-005 · DEV-043 → SCRUM-237 · DEV-044 → CAMP-060 · DEV-045 → CAMP-059, SCRUM-252, SCRUM-253, SCRUM-256 · DEV-046 → CAMP-048, CAMP-067, SCRUM-259 · DEV-047 → CAMP-005

**PO:** PO-001 → CAMP-062 · PO-002 → CAMP-031 · PO-003 → SCRUM-260 · PO-004 → CAMP-067 · PO-005 → CAMP-010, CAMP-033 · PO-006 → CAMP-026 · PO-007 → CAMP-066 · PO-008 → SCRUM-245 · PO-009 → CAMP-058, CAMP-068 · PO-010 → CAMP-029 · PO-011 → CAMP-030 · PO-012 → CAMP-046, CAMP-069 · PO-013 → CAMP-028 · PO-014 → CAMP-005, CAMP-022 · PO-015 → CAMP-034 · PO-016 → CAMP-011 · PO-017 → CAMP-035

## 3. Tickets a crear

Formato: título con la convención `[Severidad] Portal/Módulo: síntoma` (los bugs) o `Portal/Módulo: valor` (historias y tareas). El tipo entre paréntesis es el nombre del tipo en la API de Jira.

### 3.1 Sprint 10 · Producción segura

#### CAMP-001 · [Crítica] Director/Alumnos: restaurar la alumna real borrada durante el QA y su pago

- **Tipo:** Tarea (Task) · **Prioridad:** Highest · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `incidente`, `mod-alumnos`, `mod-pagos`, `bloqueado-decision`, `must`
- **Orígenes:** INCIDENTE-2026-10-13, QA1-023
- **Bloqueado por:** Decisión del responsable del proyecto (método de restauración)
- **Descripción:** El 13/10 un script de QA borró en producción la fila de `students` de una alumna real (id 9a444b3f…) y, en cascada, 1 pago PAGADO de $15.000. `profiles` y auth quedaron huérfanos. Opciones: backup/PITR restaurado en un proyecto aparte (verificar el plan: en Free no hay backups) o reinsert manual con los mismos `id`, `profile_id`, `receipt_number` y fechas, en una transacción, invalidando después el tag `students`. No recrearla desde la UI (dispararía una invitación a la persona real).
- **Criterios de aceptación:**
  - La fila de `students` y el pago existen con sus ids originales.
  - La alumna entra a su portal y el pago figura en /director/payments y en los reportes.
  - Se registra en el incidente qué se restauró, cómo y quién lo autorizó.

#### CAMP-002 · [Crítica] Todos/Auth: el link de invitación permite entrar a cualquier cuenta, incluida la del director

- **Tipo:** Bug (Bug) · **Prioridad:** Highest · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa1`, `seguridad`, `mod-auth`, `must`
- **Orígenes:** DEV-001, QA1-REF-01
- **Bloqueado por:** No
- **Descripción:** El token de `/invite/[encoded]` es `base64url(email)`: no es secreto, no vence y no es de un solo uso. `claimInvite` toma el email del form y genera un link de recovery con la service role, así que cualquier visitante sin sesión entra como el dueño del email y le cambia la contraseña. Explotable hoy en producción.
- **Criterios de aceptación:**
  - Las invitaciones usan un token aleatorio de un solo uso, con vencimiento, guardado hasheado (migración `invitations`).
  - Una URL armada con base64(email) o un token usado/vencido muestra "Link inválido" y no genera sesión.
  - Mitigación inmediata: rechazar el claim de cuentas ya activas (`last_sign_in_at` no nulo).
  - Test que cubra el intento con base64(email).

#### CAMP-003 · [Crítica] Todos/Auth: cualquier usuario puede darse el rol director (RLS de profiles y registro público abierto)

- **Tipo:** Bug (Bug) · **Prioridad:** Highest · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-dev`, `seguridad`, `mod-auth`, `mod-usuarios`, `must`
- **Orígenes:** DEV-002, SCRUM-259 (registerAction) · **Jira relacionado:** SCRUM-259
- **Bloqueado por:** No
- **Descripción:** La policy `authenticated_update_own_profile` no tiene `WITH CHECK` ni restricción de columnas: un alumno hace `profiles.update({role:'director'})` con su JWT y en el siguiente request es director (verificado con ROLLBACK). Además `disable_signup` está en false y `loginAction` crea perfiles con el rol de `user_metadata`. `registerAction` es un endpoint público muerto que crea alumnos huérfanos.
- **Criterios de aceptación:**
  - Deshabilitar signups en Supabase (sin código, hoy).
  - REVOKE de UPDATE/INSERT sobre `profiles.role` para `authenticated` y DROP/ajuste de las policies de INSERT/UPDATE (con WITH CHECK).
  - `loginAction` nunca toma el rol de `user_metadata`; se elimina `registerAction`/`registerSchema`.
  - Test de integración: con el JWT de un alumno, `profiles.update({role})` falla.

#### CAMP-004 · [Crítica] Infra: producción, dev y tests E2E comparten el mismo proyecto Supabase y la misma base

- **Tipo:** Tarea (Task) · **Prioridad:** Highest · **Épica:** E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa1`, `seguridad`, `mod-infra`, `must`
- **Orígenes:** DEV-005, INCIDENTE-2026-10-13 (preventiva 1), BA-032 (entorno), SCRUM-239, SCRUM-155 · **Jira relacionado:** SCRUM-239, SCRUM-155, SCRUM-156
- **Bloqueado por:** No
- **Descripción:** `.env.local` y `.env.test` apuntan a producción: el seed E2E hace DELETE en producción, existen cuentas `@e2e.test` con contraseña versionada (incluida una director) y los QA escriben datos reales. Causa de infraestructura del incidente del 13/10.
- **Criterios de aceptación:**
  - Proyecto Supabase de test/dev separado, con las migraciones 0001-0013 aplicadas; `.env.local`, `.env.test` y los secrets de CI apuntan a él.
  - `scripts/seed-e2e.ts` aborta si la URL es la de producción; `TEST_PASSWORD` sale a una variable de entorno.
  - En producción: cuentas `@e2e.test` y `e2e-*` borradas o baneadas; contraseñas y `SUPABASE_SECRET_KEY` rotadas.
  - `select count(*) from profiles where email like '%@e2e.test'` en producción da 0.

#### CAMP-005 · [Alta] Todos: la app se cuelga cuando llegan dos consultas a la vez (conexión de Drizzle bloqueada)

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-po`, `origen-qa1`, `origen-qa2`, `mod-infra`, `must`
- **Orígenes:** DEV-047, QA2-011, QA1-016 (cuelgue), PO-014 (parte técnica), DEV-042, E-01 (hallazgos.md)
- **Bloqueado por:** No
- **Descripción:** postgres.js pipelinea las queries concurrentes sobre la única conexión (`max: 1`) y Supavisor en modo transacción (:6543) nunca les responde: todo el proceso queda colgado (skeleton infinito, portal alumno inutilizable, login del alumno que no termina). Aplica también en Vercel. Incluye la carrera de `Promise.all` en `courses/actions.ts` (DEV-042).
- **Criterios de aceptación:**
  - `src/lib/drizzle/index.ts` con `max_pipeline: 0` (y `max: 5` en desarrollo, `max_lifetime`).
  - Navegar las 11 pantallas del alumno 3 veces seguidas con 2-3 pestañas en paralelo, sin cuelgues; ninguna página Drizzle pasa de ~2 s.
  - Script de diagnóstico versionado (`scripts/diag-pipeline.cjs`).
  - Se corrige la memoria del proyecto y la nota de `docs/qa-backlog.md` sobre `Promise.all`.

#### CAMP-006 · [Alta] API/Crons: los endpoints de cron se pueden disparar sin secreto (en dev siempre; en prod si falta CRON_SECRET)

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa1`, `seguridad`, `mod-automatizaciones`, `must`
- **Orígenes:** DEV-028, QA1-009, E-04 (hallazgos.md) · **Jira relacionado:** SCRUM-219
- **Bloqueado por:** No
- **Descripción:** Con `NODE_ENV=development` se saltea el chequeo, y si la variable falta, `Bearer undefined` pasa la validación. Con la base de dev apuntando a producción, cualquiera puede mandar emails a alumnos reales y restringir accesos por mora.
- **Criterios de aceptación:**
  - Helper `assertCron()` usado por los 5 crons, también en desarrollo; si falta `CRON_SECRET` responde 500.
  - `CRON_SECRET` cargado en Vercel Production y Preview (verificado).
  - `curl -H 'Authorization: Bearer undefined'` responde 401/500, no 200.

#### CAMP-007 · [Crítica] Director/Administrativo/Reclamos: el personal no ve ningún reclamo (el flujo de reclamos está roto)

- **Tipo:** Bug (Bug) · **Prioridad:** Highest · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa2`, `mod-reclamos`, `defensa-tesis`, `must`
- **Orígenes:** QA2-013 · **Jira relacionado:** SCRUM-254
- **Bloqueado por:** No
- **Descripción:** Las páginas de staff leen `complaints` con el JWT del usuario; la única policy es `select_own`, así que RLS devuelve 0 filas sin error. Afecta listado, detalle (404) y el contador del dashboard (siempre 0).
- **Criterios de aceptación:**
  - Director y administrativo ven todos los reclamos (incluidos el del seed y el de QA2) en listado y detalle, leídos por Drizzle después de `requireRole`.
  - El contador "reclamos abiertos" de ambos dashboards es correcto.
  - Si la consulta falla se muestra un error, no "Sin reclamos".

#### CAMP-008 · [Alta] Director/Administrativo/Alumnos: el buscador no filtra al escribir y se opera sobre la fila equivocada

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `mod-alumnos`, `incidente`, `must`
- **Orígenes:** QA1-024, INCIDENTE-2026-10-13 (causa)
- **Bloqueado por:** No
- **Descripción:** El buscador es un form GET sin botón ni debounce: solo filtra con Enter y no normaliza acentos ("nandu" no encuentra "Ñandú"). El usuario cree que filtró y opera sobre otra fila: causa directa del incidente.
- **Criterios de aceptación:**
  - Componente `SearchInput` con debounce de 300 ms y botón visible; la URL refleja `?q=`.
  - Búsqueda insensible a mayúsculas y acentos por nombre, email y DNI.
  - Muestra "N resultados para «q»" o "Sin resultados". Mismo componente en Docentes y Usuarios.

#### CAMP-009 · [Media] Todos/Auth: "Cerrar sesión" cierra la sesión en todos los dispositivos

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `mod-auth`, `must`
- **Orígenes:** QA1-022
- **Bloqueado por:** No
- **Descripción:** `signOut()` sin `scope` usa `global` y revoca todos los refresh tokens: el personal que usa la PC del instituto y el celular pierde ambas sesiones (y cortó sesiones compartidas durante el QA).
- **Criterios de aceptación:**
  - `signOut({ scope: 'local' })`; con dos navegadores, cerrar sesión en uno no afecta al otro.
  - Opcional: acción "Cerrar sesión en todos los dispositivos" en el perfil.

#### CAMP-010 · [Alta] Gestión: relevar con la Directora las decisiones que bloquean historias (I-01..I-09, Q-01..Q-06)

- **Tipo:** Tarea (Task) · **Prioridad:** High · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-po`, `regla-negocio`, `bloqueado-cliente`, `defensa-tesis`, `must`
- **Orígenes:** BA §8, hallazgos.md §I, PO-005 · **Jira relacionado:** SCRUM-180, SCRUM-181, SCRUM-187, SCRUM-233
- **Bloqueado por:** No
- **Descripción:** Hay 15 preguntas abiertas que bloquean al menos 12 ítems: quién toma asistencia (I-01), porcentajes de descuento/recargo (I-02), matrícula y cuota (I-03), lista de espera y recursado (I-04/05), reactivación por pago (I-06), contadora (I-07), reportes para administrativo (I-08), Marketing (I-09), tardanza y redondeo (Q-01), pesos de evaluaciones (Q-02), egreso (Q-03), umbral de alerta (Q-04), vencimiento distinto del 10 (Q-05) y borrado de material por el docente (Q-06).
- **Criterios de aceptación:**
  - Acta de la reunión con cada respuesta, guardada en `docs/` y enlazada desde cada ticket bloqueado.
  - Se quita el label `bloqueado-cliente` de los tickets resueltos.

#### CAMP-011 · [Media] Gestión: cerrar el Sprint 9 vencido, registrar la retrospectiva y actualizar las métricas

- **Tipo:** Tarea (Task) · **Prioridad:** Medium · **Épica:** E7 · QA-2026-10 · Defensa y documentación (nueva) · **Sprint:** 10 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-po`, `defensa-tesis`, `must`
- **Orígenes:** PO-016
- **Bloqueado por:** No
- **Descripción:** El Sprint 9 venció el 11/09 sin avance y sin story points. Hay que cerrarlo, documentar el impedimento y dejar las métricas al día: es la evidencia de Scrum que evalúa la materia.
- **Criterios de aceptación:**
  - Sprint 9 cerrado; sus 10 issues pasan al backlog de las épicas correspondientes.
  - Retrospectiva del Sprint 9 en `docs/`, con el impedimento y la decisión tomada.
  - `docs/metricas-sprints.md` incluye el Sprint 9 y, al cierre, los sprints de la campaña.

### 3.2 Sprint 11 · Reglas del cliente y datos sin pérdidas

#### CAMP-012 · [Alta] Todos/Datos: cualquier usuario autenticado puede leer pagos, DNI, notas y asistencia de todos (RLS USING true)

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa2`, `seguridad`, `privacidad`, `mod-infra`, `must`
- **Orígenes:** DEV-003, QA2-009 (lectura de enrollment_id), BA-025 (parte) · **Jira relacionado:** SCRUM-250
- **Bloqueado por:** No
- **Descripción:** Las policies de lectura son `USING (true)`: con la publishable key y su JWT, un alumno lee datos personales y contables de todos y puede desanonimizar las encuestas docentes.
- **Criterios de aceptación:**
  - Las lecturas sensibles pasan al servidor (Drizzle después de autorizar) y las policies de SELECT quedan en "propias" o se revocan (opción A de DEV-003).
  - Con el JWT de un alumno, `from('payments').select()` devuelve solo sus pagos.
  - No se agregan policies de staff que reabran la exposición.

#### CAMP-013 · [Alta] Administrativo: el acceso a secciones de dirección depende de user_metadata y las páginas no revalidan el rol

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa1`, `seguridad`, `mod-auth`, `must`
- **Orígenes:** DEV-004, QA1-004, QA1-005 · **Jira relacionado:** SCRUM-253
- **Bloqueado por:** No
- **Descripción:** `proxy.ts` decide con `user_metadata.role` (editable por el usuario), `director/layout.tsx` acepta al administrativo y la lista negra está incompleta: el administrativo navega `/director`, `/risk`, `/documents`, `/reports`, `/payments`.
- **Criterios de aceptación:**
  - El proxy usa `app_metadata.role` o `profiles.role`.
  - Layout `director-only` para las secciones exclusivas; lista blanca explícita de pantallas compartidas (si las hay).
  - Un administrativo que entra por URL a cualquier `/director/*` no compartida va a su portal o a /403.

#### CAMP-014 · [Alta] Profesor: puede tomar, corregir o borrar asistencia y publicar o generar autoevaluaciones de cursos ajenos

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa2`, `seguridad`, `mod-asistencia`, `mod-autoevaluaciones`, `must`
- **Orígenes:** DEV-011, DEV-015, QA2-004, QA2-005, BA-011 (propiedad) · **Jira relacionado:** SCRUM-246
- **Bloqueado por:** No
- **Descripción:** Las actions de asistencia y autoevaluaciones solo hacen `requireRole`: un profesor opera sobre cualquier `courseId`, publicar envía emails a alumnos de otro curso y `/profesor/assessments/[id]` muestra preguntas y respuestas de cursos ajenos. Las notas (DEV-010) van en SCRUM-246 con el mismo helper.
- **Criterios de aceptación:**
  - Helper `assertTeacherOwnsCourse` (compartido con SCRUM-246) en `record/update/deleteAttendance*`, `generate/publish/archiveAssessmentProfesor*`.
  - `/profesor/assessments/[id]` de un curso ajeno devuelve 404.
  - Tests: un POST con un `courseId` ajeno devuelve "No autorizado".

#### CAMP-015 · [Alta] Alumno/Evaluación docente: se puede votar en cursos ajenos, votar infinitas veces y bloquear la encuesta de otro

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa2`, `seguridad`, `mod-eval-docentes`, `must`
- **Orígenes:** DEV-012, QA2-010 (encuesta) · **Jira relacionado:** SCRUM-250
- **Bloqueado por:** No
- **Descripción:** `submitSurveyAction` toma `teacherId`/`courseId` del form sin verificar inscripción y, sin `enrollmentId`, no controla duplicados: un alumno puede inflar o hundir la calificación de cualquier docente. La encuesta ya enviada se reabre sin `?enrollment=`.
- **Criterios de aceptación:**
  - La action deriva la inscripción activa del alumno en el servidor; sin inscripción, rechaza.
  - Una sola encuesta por alumno y curso, controlada en el servidor (registro separado, ver SCRUM-250).
  - La página de una encuesta ya respondida no reabre el formulario.

#### CAMP-016 · [Alta] Director/Administrativo/Alumnos: borrar un alumno elimina en cascada sus pagos y deja su cuenta habilitada

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa1`, `regla-negocio`, `mod-alumnos`, `mod-pagos`, `incidente`, `must`
- **Orígenes:** DEV-019, QA1-023, BA-005, INCIDENTE-2026-10-13 (preventivas 2 y 3) · **Jira relacionado:** SCRUM-234
- **Bloqueado por:** No
- **Descripción:** `deleteStudent` hace DELETE y `payments.student_id` es `ON DELETE CASCADE`: se pierde historia contable (contra la decisión D-02), `profiles`/auth quedan huérfanos y la confirmación es genérica. Pasó en producción el 13/10.
- **Criterios de aceptación:**
  - Baja lógica (estado inactivo y acceso bloqueado); los pagos siguen en los reportes.
  - `payments.student_id` pasa a `ON DELETE RESTRICT`; el borrado físico queda solo para director y solo sin pagos ni inscripciones.
  - La confirmación nombra al alumno (nombre y DNI) e informa pagos e inscripciones afectados.
  - Después de la baja, el usuario aterriza en el listado con toast (resuelve SCRUM-234).
  - Test de regresión: dar de baja un alumno con pagos no elimina pagos.

#### CAMP-017 · [Alta] Director/Docentes/Alumnos: las listas cacheadas muestran datos viejos (informe docente 404, conteos que no coinciden)

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa1`, `origen-qa2`, `mod-eval-docentes`, `mod-alumnos`, `mod-ui`, `must`
- **Orígenes:** DEV-039, QA2-015, QA1-002
- **Bloqueado por:** No
- **Descripción:** `unstable_cache` sin TTL y persistido en disco sirve ids viejos cuando los datos cambian por fuera de la app (seed, SQL): el informe del docente da 404 y "0 encuestas", y dashboard (9), Alumnos (17) y Usuarios (14) no coinciden. Además hay tags que nadie invalida.
- **Criterios de aceptación:**
  - `revalidate: 300` en las listas cacheadas e invalidación de los tags faltantes (DEV-039).
  - Endpoint de revalidación con secret, usado al final del seed.
  - Después del seed, el informe del Profesor E2E muestra 1 encuesta y los tres conteos coinciden o el texto aclara qué cuenta cada uno.

#### CAMP-018 · [Alta] Director/Reportes y Cierre de ciclo: los cálculos se cortan en 1000 filas y no coinciden con lo que se consolida

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-reportes`, `mod-promociones`, `mod-cierre-ciclo`, `must`
- **Orígenes:** DEV-033
- **Bloqueado por:** No
- **Descripción:** Promociones, Cierre de ciclo, Reportes y el dashboard calculan con PostgREST, que corta en 1000 filas por defecto: con datos reales los números son incorrectos y difieren del cierre que se consolida.
- **Criterios de aceptación:**
  - Esas pantallas calculan con los services Drizzle (agregados en SQL), sin límite implícito.
  - Con más de 1000 registros de asistencia, el % de Promociones coincide con el del cierre de ciclo.

#### CAMP-019 · [Alta] Pagos/Automatizaciones: ningún proceso automático pasa las cuotas vencidas a "Vencida"

- **Tipo:** Bug (Bug) · **Prioridad:** High · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa2`, `regla-negocio`, `mod-pagos`, `mod-automatizaciones`, `must`
- **Orígenes:** DEV-025, BA-007 (a), QA2-014 (observación) · **Jira relacionado:** SCRUM-207, SCRUM-209, SCRUM-206
- **Bloqueado por:** No
- **Descripción:** Las alertas de mora, la restricción de acceso y el riesgo dependen de que alguien apriete "Verificar mora": el `status` de la DB queda viejo y cada pantalla lo compensa a su manera.
- **Criterios de aceptación:**
  - El cron diario pasa a `overdue` toda cuota `pending` con vencimiento anterior a hoy (hora AR) y después corre las alertas.
  - El botón "Verificar mora" ejecuta exactamente lo mismo, sin duplicar avisos.
  - Con un pago pending vencido, el cron (con secret) lo pasa a overdue y manda la alerta.

#### CAMP-020 · [Media] Director/Administrativo/Pagos: los contadores Pendientes/Vencidos/Pagados no suman el total y cada pantalla dice otra cosa

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `origen-qa2`, `mod-pagos`, `must`
- **Orígenes:** QA1-003, QA2-014 (estado)
- **Bloqueado por:** No
- **Descripción:** Hay tres criterios de "vencido" (lista por fecha, dashboard por status, Excel por status): un pending vencido cuenta dos veces y el dashboard lo muestra "a vencer".
- **Criterios de aceptación:**
  - Función única `effectiveStatus()` usada por tarjetas, lista, dashboards, panel del alumno y Excel.
  - Pendientes + Vencidos + Pagados + Anulados = total.
  - El mismo pago muestra el mismo estado en todas las pantallas.

#### CAMP-021 · [Media] Promociones: el redondeo permite promover con 79,5% de asistencia o 6,95 de promedio

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** 11 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `regla-negocio`, `mod-promociones`, `must`
- **Orígenes:** DEV-034, BA-002 (redondeo) · **Jira relacionado:** SCRUM-190
- **Bloqueado por:** No
- **Descripción:** Se redondea antes de comparar con el umbral. Por defecto no se redondea; si la Directora define otra regla (Q-01), se aplica esa.
- **Criterios de aceptación:**
  - Test unitario: 35/44 asistencias no es apto; notas [7, 6.9] no es apto.
  - La comparación usa el valor sin redondear y la misma constante que el resto de la app.

### 3.3 Sprint 12 · Cada rol, su día (y la defensa)

#### CAMP-022 · [Media] Todos: los errores de permisos o de base muestran la pantalla de error genérica y los formularios quedan colgados sin aviso

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-po`, `origen-qa1`, `mod-ui`, `must`
- **Orígenes:** DEV-022, QA1-016 (feedback), PO-014
- **Bloqueado por:** No
- **Descripción:** `requireRole` lanza y no hay ningún `error.tsx`; la UI del administrativo ofrece acciones que son solo de director (reenviar invitación, editar notas, borrar material). Ante una mutación que no responde no hay timeout ni mensaje.
- **Criterios de aceptación:**
  - `checkRole` que devuelve `{error}` en las actions con `ActionResult`; toast en lugar de pantalla de error.
  - `src/app/(dashboard)/error.tsx` con "Reintentar" y mensaje en español.
  - Timeout de 20 s en `useFormAction` con toast "No pudimos guardar, reintentá".
  - La UI del administrativo no muestra acciones que no puede ejecutar.

#### CAMP-023 · [Media] Pagos/Alertas: la alerta al alumno y la alerta de mora a Dirección comparten la marca y una anula a la otra

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `regla-negocio`, `mod-pagos`, `mod-notificaciones`, `must`
- **Orígenes:** DEV-026, BA-007 (b) · **Jira relacionado:** SCRUM-207
- **Bloqueado por:** No
- **Descripción:** Una sola columna `overdue_alert_sent_at` para dos avisos distintos: si el cron le mandó el email al alumno, el aviso de 15 días a Dirección no sale nunca.
- **Criterios de aceptación:**
  - Cada aviso tiene su propia marca (columnas o tabla de envíos).
  - Un pago vencido hace 20 días genera las dos alertas, una vez cada una.

#### CAMP-024 · [Media] Pagos: las cuotas suspendidas (más de 30 días de mora) no se pueden cobrar y desaparecen de la deuda

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `regla-negocio`, `mod-pagos`, `must`
- **Orígenes:** DEV-029, BA-009 (parte 1)
- **Bloqueado por:** No
- **Descripción:** Un pago `suspended` no admite "Marcar como pagado" y no suma en la deuda informada: el alumno que quiere regularizar no puede pagar.
- **Criterios de aceptación:**
  - Se puede cobrar un pago `suspended` y se emite el recibo.
  - La deuda informada (dashboard, alumno, reportes) incluye las cuotas suspendidas.

#### CAMP-025 · [Media] Director/Cursos: el cupo seleccionado no se ve (botón blanco sobre blanco)

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `mod-cursos`, `mod-ui`, `must`
- **Orígenes:** QA1-001 · **Jira relacionado:** SCRUM-236
- **Bloqueado por:** No
- **Descripción:** `CourseForm` usa `bg-brand-600`/`border-brand-400`, que no existen en el `@theme`: el cupo elegido (15 por defecto) se ve en blanco y el usuario no sabe qué cupo quedó. Pasa también en `update-password` y `GenerateAssessmentForm`.
- **Criterios de aceptación:**
  - El cupo seleccionado se ve resaltado en alta y edición.
  - No quedan clases `brand-400`/`brand-600` sin definir (o se agregan esos tokens).

#### CAMP-026 · Administrativo/Pagos: generar las cuotas del mes en un solo paso

- **Tipo:** Historia (Story) · **Prioridad:** High · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-po`, `mod-pagos`, `defensa-tesis`, `must`
- **Orígenes:** PO-006, BA-018 (MVP) · **Jira relacionado:** SCRUM-179, SCRUM-181
- **Bloqueado por:** No
- **Descripción:** Como administrativa quiero generar de una vez las cuotas del mes de todos los alumnos activos (o de un curso), para no cargarlas de a una. Es el MVP de BA-018: el monto se ingresa al generar; la cuota por curso y la matrícula quedan en SCRUM-179/181 (bloqueadas por I-03).
- **Criterios de aceptación:**
  - Botón "Generar cuotas del mes" por curso o para todos los activos, con vencimiento el día 10.
  - Es idempotente: no duplica cuotas del mismo alumno y mes (índice único de DEV-045).
  - Resumen al terminar: N cuotas generadas, M ya existentes.

#### CAMP-027 · [Media] Alumno: el panel muestra las cuotas vencidas como "pendientes", con fecha ISO y sin formato de moneda

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa2`, `mod-pagos`, `mod-ui`, `must`
- **Orígenes:** QA2-014
- **Bloqueado por:** No
- **Descripción:** La tarjeta del panel imprime `dueDate` y `amount` crudos ("Vence: 2026-10-10 · $15000.00") y no distingue vencidas; tampoco enlaza a Pagos.
- **Criterios de aceptación:**
  - Mismo formato es-AR que /alumno/payments, badge "Vencido" según `effectiveStatus()` y link a Pagos.

#### CAMP-028 · Alumno: ver en el panel si voy a promocionar

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-po`, `mod-promociones`, `defensa-tesis`, `must`
- **Orígenes:** PO-013 · **Jira relacionado:** SCRUM-188, SCRUM-190
- **Bloqueado por:** No
- **Descripción:** Como alumno quiero ver mi asistencia y mi promedio contra los mínimos y un estado claro, para no enterarme al cierre de ciclo de que no promociono. Hoy los colores usan umbrales fijos en el código y el panel no muestra autoevaluaciones ni material.
- **Criterios de aceptación:**
  - Tarjeta "Tu cursada": asistencia vs. mínimo, promedio vs. mínimo y estado (Vas bien / En riesgo / No cumplís), con las constantes de SCRUM-188/190.
  - Accesos a Autoevaluaciones y Material desde el panel.

#### CAMP-029 · Profesor: ver en el panel la clase de hoy y los alumnos a seguir

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-po`, `mod-asistencia`, `mod-riesgo`, `defensa-tesis`, `must`
- **Orígenes:** PO-010
- **Bloqueado por:** No
- **Descripción:** Como docente quiero ver la clase de hoy y qué alumnos están bajo el umbral de asistencia o de nota, para intervenir a tiempo. Hoy el riesgo solo lo ve Dirección.
- **Criterios de aceptación:**
  - Tarjeta "Hoy" con el curso del día y el acceso a tomar lista.
  - Tarjeta "Alumnos a seguir" con los que están bajo el umbral de alerta (mismas constantes que la alerta).
  - En el detalle del curso, tabla por alumno con % de asistencia, promedio y estado.

#### CAMP-030 · Profesor/Asistencia: ir directo a tomar lista de la clase de hoy

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-po`, `mod-asistencia`, `must`
- **Orígenes:** PO-011
- **Bloqueado por:** No
- **Descripción:** Como docente quiero tomar lista en un toque, porque es mi tarea más frecuente. Hoy hay que pasar por un listado, elegir el curso y confirmar la fecha aunque tenga un solo curso.
- **Criterios de aceptación:**
  - Si hay clase hoy según `class_days`, el acceso directo abre `/profesor/attendance/new?courseId=…` con la fecha de hoy (hora AR).
  - Con un solo curso, queda preseleccionado.

#### CAMP-031 · Director: dashboard que muestre lo que hay que resolver hoy

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-po`, `mod-ui`, `defensa-tesis`, `must`
- **Orígenes:** PO-002
- **Bloqueado por:** No
- **Descripción:** Como Directora quiero ver al entrar el monto adeudado, los alumnos en riesgo, los cursos casi llenos o vacíos y si las automatizaciones corrieron, sin abrir cuatro pantallas. Es la primera pantalla de la demo.
- **Criterios de aceptación:**
  - Franja "Requiere tu atención": $ adeudado y morosos, alumnos en riesgo alto (link a /director/risk), cursos con ocupación ≥ 90% o ≤ 30%, última corrida de automatizaciones.
  - Los gráficos usan los umbrales del cliente (SCRUM-188/190) y los conteos coinciden con las listas.

#### CAMP-032 · Alumno: ver y descargar mis recibos y certificados

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `mod-pagos`, `mod-promociones`, `defensa-tesis`, `must`
- **Orígenes:** BA-016, E-03 (hallazgos.md)
- **Bloqueado por:** No
- **Descripción:** Como alumno quiero descargar el recibo de cada cuota pagada y el certificado de cada nivel aprobado, sin ir a la secretaría.
- **Criterios de aceptación:**
  - "Ver recibo" en cada pago `paid` del alumno, imprimible o PDF.
  - "Descargar certificado" en cada inscripción `completed`.
  - Un recibo o certificado de otro alumno se rechaza; el administrativo abre recibos bajo su propio portal.

#### CAMP-033 · Marketing: definir con la Directora si se oculta el módulo y actuar en consecuencia

- **Tipo:** Tarea (Task) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-po`, `mod-marketing`, `bloqueado-cliente`, `must`
- **Orígenes:** PO-005, I-09 · **Jira relacionado:** SCRUM-187, SCRUM-255
- **Bloqueado por:** I-09
- **Descripción:** La Directora pidió sacar Marketing (SCRUM-187), pero sigue en el menú, con ABM incompleto (D-03/D-04) y bugs cargados (SCRUM-255). Propuesta del PO: ocultarlo con un feature flag sin borrar el código.
- **Criterios de aceptación:**
  - Decisión registrada (I-09).
  - Si se oculta: sale del menú y de la demo; SCRUM-255 pasa a Won't do; SCRUM-187 se cierra con esta implementación.

#### CAMP-034 · Defensa: datos de demo realistas en el entorno de test y guion de demo por rol

- **Tipo:** Tarea (Task) · **Prioridad:** High · **Épica:** E7 · QA-2026-10 · Defensa y documentación (nueva) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-po`, `defensa-tesis`, `must`
- **Orígenes:** PO-015
- **Bloqueado por:** No
- **Descripción:** Para la defensa hace falta un instituto creíble (unos 60 alumnos, 6 cursos, 3 meses de asistencia, notas y pagos, con casos de mora, riesgo y promoción) sobre el proyecto separado de la tarea de DEV-005, y un guion de 10 minutos.
- **Criterios de aceptación:**
  - `pnpm seed:demo` sobre el proyecto de test, con nombres realistas y sin prefijo E2E.
  - Gráficos, riesgo y promociones muestran casos en la demo.
  - Guion de demo por rol en `docs/`, que recorre inscripción con cupo, toma de lista, alerta de riesgo, cobro y recibo, promoción y certificado, y autoevaluación IA.

#### CAMP-035 · Documentación: alinear CLAUDE.md, encuentros y presentación con el producto y las reglas vigentes

- **Tipo:** Tarea (Task) · **Prioridad:** High · **Épica:** E7 · QA-2026-10 · Defensa y documentación (nueva) · **Sprint:** 12 · **MoSCoW:** Must · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-po`, `defensa-tesis`, `must`
- **Orígenes:** BA-030, BA-031, PO-017
- **Bloqueado por:** No
- **Descripción:** `CLAUDE.md` lista como pendientes tickets cerrados, dice "material por curso" y tiene los umbrales viejos; los encuentros y la presentación usan "IICANA" como nombre del producto y no incorporan los casos borde nuevos.
- **Criterios de aceptación:**
  - `CLAUDE.md` y `CONTEXT.md` reflejan 70% y 0–100 (o los marcan como pendientes de SCRUM-188/190), sin pendientes cerrados.
  - Encuentro 6 incorpora o justifica los casos CB10–CB24 de BA §5.3; la edad mínima figura como implementada.
  - "Smart Learning" es el producto e IICANA el cliente en la presentación y el Encuentro 1.
  - Memoria del proyecto y nota de `qa-backlog.md` corregidas (DEV-047).

### 3.4 Sprint 13 · Robustez y pulido

#### CAMP-036 · [Media] Alumno/Autoevaluaciones: las respuestas correctas viajan al navegador antes de responder

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa2`, `seguridad`, `mod-autoevaluaciones`, `should`
- **Orígenes:** DEV-014, QA2-010 (respuestas) · **Jira relacionado:** SCRUM-251
- **Bloqueado por:** No
- **Descripción:** `QuizPlayer` recibe `correct` y `explanation` como props: la respuesta está en el HTML/RSC antes de contestar.
- **Criterios de aceptación:**
  - La corrección se hace en el servidor; el cliente recibe la explicación solo después de responder cada pregunta o al enviar.
  - El payload inicial del quiz no contiene `correct` ni `explanation`.

#### CAMP-037 · [Media] Material y Perfil: los archivos subidos aceptan cualquier tipo declarado por el cliente y quedan huérfanos

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa1`, `seguridad`, `mod-material`, `mod-usuarios`, `should`
- **Orígenes:** DEV-040 (uploads), QA1-017 · **Jira relacionado:** SCRUM-189
- **Bloqueado por:** No
- **Descripción:** El `contentType` lo decide el navegador y solo se valida la extensión: un HTML renombrado se sirve desde el bucket público. El avatar viejo queda en el bucket y la URL fija hace que se vea el anterior. (El material por curso y el bucket privado van en SCRUM-189.)
- **Criterios de aceptación:**
  - Validación por magic bytes y `contentType` forzado desde una whitelist (avatar y documentos).
  - Al reemplazar el avatar se borra el anterior y la URL lleva cache-busting (`?v=`).
  - Un HTML renombrado `.pdf` o `.png` se rechaza.

#### CAMP-038 · [Media] Infra: la app no envía headers de seguridad (CSP, anti-clickjacking, nosniff, Referrer-Policy)

- **Tipo:** Tarea (Task) · **Prioridad:** Medium · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `seguridad`, `mod-infra`, `should`
- **Orígenes:** DEV-007
- **Bloqueado por:** No
- **Descripción:** Ninguna respuesta lleva CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options ni Referrer-Policy.
- **Criterios de aceptación:**
  - `next.config.ts` define los headers; securityheaders.com da al menos A en producción.
  - La app sigue funcionando (Supabase, Resend, fuentes) con la CSP aplicada.

#### CAMP-039 · [Media] Pagos/Alertas: los fallos de envío de email se marcan como enviados y la UI informa éxito

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-notificaciones`, `mod-automatizaciones`, `should`
- **Orígenes:** DEV-027 · **Jira relacionado:** SCRUM-218, SCRUM-219, SCRUM-220
- **Bloqueado por:** No
- **Descripción:** No se revisa la respuesta de Resend: si el envío falla, la alerta queda marcada como enviada y no se reintenta.
- **Criterios de aceptación:**
  - Con `RESEND_API_KEY` inválida el cron reporta `failed > 0` y la marca de enviado queda en null.
  - El panel de automatizaciones muestra enviados y fallidos.

#### CAMP-040 · [Media] Mora: la restricción por 2 cuotas no cuenta las suspendidas, no se levanta al pagar y las acciones del alumno siguen funcionando

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa2`, `regla-negocio`, `mod-pagos`, `bloqueado-cliente`, `should`
- **Orígenes:** DEV-031, BA-008, QA2-014 (observación) · **Jira relacionado:** SCRUM-209
- **Bloqueado por:** I-06 (rehabilitación automática o por Dirección)
- **Descripción:** La suspensión pasa la primera cuota a `suspended` y el corte por "2 cuotas vencidas" casi nunca llega a 2; al pagar, el acceso no se rehabilita; un alumno restringido puede seguir ejecutando actions.
- **Criterios de aceptación:**
  - Una cuota `suspended` + una `overdue` restringen el acceso.
  - Las actions del portal alumno rechazan a un alumno restringido.
  - Al quedar con menos de 2 cuotas impagas, el acceso se rehabilita según la respuesta a I-06.

#### CAMP-041 · [Media] Riesgo de abandono: la intervención registrada se pierde en la corrida siguiente y la tendencia cuenta doble

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-riesgo`, `should`
- **Orígenes:** DEV-038 · **Jira relacionado:** SCRUM-214
- **Bloqueado por:** No
- **Descripción:** La detección diaria pisa la intervención que registró Dirección y el cálculo de tendencia duplica registros.
- **Criterios de aceptación:**
  - Intervenir un alumno y correr la detección: la intervención sigue visible.
  - La tendencia se calcula una vez por período.

#### CAMP-042 · [Media] Asistencia: el doble envío dispara alertas e IA dos veces y el estado de cada alumno no se valida

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-asistencia`, `should`
- **Orígenes:** DEV-037, SCRUM-258 (asistencia) · **Jira relacionado:** SCRUM-232, SCRUM-240, SCRUM-258
- **Bloqueado por:** No
- **Descripción:** La toma de lista no usa el schema Zod (`recordAttendanceSchema` está muerto): un valor manipulado de `status` termina en 500, y un doble submit manda alertas y genera autoevaluaciones dos veces. Las fechas futuras van en SCRUM-240.
- **Criterios de aceptación:**
  - La action valida con Zod (incluido el enum present/absent/late).
  - Un doble submit genera un solo email y una sola generación de IA.

#### CAMP-043 · Director/Asistencia: definir quién toma lista y advertir si la fecha no es día de clase

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-asistencia`, `bloqueado-cliente`, `should`
- **Orígenes:** BA-011, G-06/I-01 (hallazgos.md)
- **Bloqueado por:** I-01
- **Descripción:** Como Directora quiero que la asistencia la tome quien yo defina, solo en su curso y en un día de clase real, para que el 70% se calcule sobre datos válidos.
- **Criterios de aceptación:**
  - Solo los roles definidos en I-01 toman lista; la decisión queda escrita en el Encuentro 4.
  - Si la fecha no coincide con `class_days`, se pide confirmar "¿Es una clase de recuperación?".
  - Borrar una sesión registra quién la borró.

#### CAMP-044 · Director/Cierre de ciclo: cerrar un ciclo lectivo concreto, con egreso bien definido y sin efectos dobles

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `regla-negocio`, `mod-cierre-ciclo`, `bloqueado-cliente`, `should`
- **Orígenes:** BA-014, DEV-035, SCRUM-259 (egreso) · **Jira relacionado:** SCRUM-259
- **Bloqueado por:** Q-03
- **Descripción:** Como Directora quiero cerrar un ciclo lectivo concreto y que "Egresado" signifique lo que significa en el instituto. Hoy el cierre evalúa todo el historial, no es transaccional ni idempotente, y una baja vieja impide egresar.
- **Criterios de aceptación:**
  - El cierre evalúa solo las inscripciones del ciclo elegido.
  - La regla de egreso es la que define Q-03 (propuesta: al completar Avanzado); una baja vieja no lo impide.
  - Ejecutarlo dos veces no repite promociones ni emails (transacción + idempotencia).

#### CAMP-045 · [Media] Alertas: el aviso de asistencia baja y el riesgo usan umbrales distintos de la regla de promoción

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-riesgo`, `mod-notificaciones`, `bloqueado-cliente`, `should`
- **Orígenes:** BA-019 · **Jira relacionado:** SCRUM-210, SCRUM-190
- **Bloqueado por:** Q-04
- **Descripción:** La alerta al docente usa 70% mientras la promoción usa 80% (y Reportes compara con 70%). El aviso tiene que llegar antes de perder el mínimo, y el riesgo no cuenta las cuotas suspendidas ni las notas del curso.
- **Criterios de aceptación:**
  - El umbral de alerta (Q-04; propuesta 80%) y el mínimo (70%) salen de constantes únicas.
  - Docente y Dirección reciben el aviso una sola vez; el email informa el mínimo vigente.
  - La detección de riesgo cuenta cuotas `overdue` y `suspended` y considera las notas del curso.

#### CAMP-046 · Reclamos: respuesta al alumno, aviso de cambio de estado y acceso desde el menú

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-po`, `origen-qa2`, `mod-reclamos`, `should`
- **Orígenes:** QA2-013 (extras), BA-015, PO-012 (reclamo del docente), E-02 · **Jira relacionado:** SCRUM-254, SCRUM-257
- **Bloqueado por:** No
- **Descripción:** Como alumno quiero encontrar "Reclamos" en mi menú y ver la respuesta del instituto, para no tener que preguntar en secretaría. Hoy no hay campo de respuesta, el cambio de estado no notifica y `createComplaintAsProfesorAction` sigue sin UI.
- **Criterios de aceptación:**
  - "Reclamos" figura en el menú del alumno.
  - El personal escribe una respuesta; el alumno la ve y recibe una notificación al cambiar el estado.
  - Se conecta o se elimina el reclamo del docente (según I-07/Q-06 y BA-015).

#### CAMP-047 · [Media] Profesor/Asistencia: en el celular los nombres de los alumnos quedan cortados al tomar lista

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa2`, `mod-asistencia`, `mod-ui`, `should`
- **Orígenes:** QA2-016 · **Jira relacionado:** SCRUM-139
- **Bloqueado por:** No
- **Descripción:** A 390 px los botones Presente/Ausente/Tarde ocupan el ancho y el nombre se trunca ("Alumn…"): con nombres reales los alumnos son indistinguibles.
- **Criterios de aceptación:**
  - A 390 px el nombre ocupa su propia línea (botones debajo) o hace wrap, sin truncar.

#### CAMP-048 · Todos: vocabulario único y en español en menús, niveles, mensajes y controles

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** 13 · **MoSCoW:** Should · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `origen-qa1`, `origen-qa2`, `mod-ui`, `should`
- **Orígenes:** BA-029, QA1-008, QA1-012, QA2-001, QA2-008, DEV-046 (LEVEL_LABELS)
- **Bloqueado por:** No
- **Descripción:** Como usuario quiero que el sistema use siempre las mismas palabras y en español. Hoy: nivel en inglés en el panel docente ("intermediate"), "Upper-intermedio", 12 mapas locales de niveles, "Mensajes" vs "Mis notificaciones", "Choose File / No file chosen".
- **Criterios de aceptación:**
  - Todos los niveles usan `LEVEL_LABELS` (se eliminan los mapas locales; `LEVEL_SHORT_LABELS` si hace falta).
  - La mensajería tiene un solo nombre en menú, título y campana en los 4 portales; "Dashboard" pasa a "Inicio".
  - Selector de archivo propio en español.
  - Ningún error técnico llega en inglés a la UI (el locale de Zod se resuelve en SCRUM-236).

### 3.5 Backlog priorizado (después de la campaña)

#### CAMP-049 · [Baja] Auth: los links de reset e invitación se arman con headers del request

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E1 · QA-2026-10 · Seguridad y datos de producción (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `seguridad`, `mod-auth`, `could`
- **Orígenes:** DEV-009
- **Bloqueado por:** No
- **Descripción:** El origen de los links sale de `Origin`/`X-Forwarded-Host`: un request manipulado puede generar links hacia otro dominio.
- **Criterios de aceptación:**
  - Los links usan una URL base de configuración (`NEXT_PUBLIC_SITE_URL`), nunca headers del request.

#### CAMP-050 · [Media] Infra: la conexión a Postgres no valida el certificado TLS y migraciones y runtime usan la misma URL

- **Tipo:** Tarea (Task) · **Prioridad:** Medium · **Épica:** E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `seguridad`, `mod-infra`, `could`
- **Orígenes:** DEV-008 · **Jira relacionado:** SCRUM-123
- **Bloqueado por:** No
- **Descripción:** `ssl: { rejectUnauthorized: false }` acepta cualquier certificado. Además conviene separar la URL de migraciones (:5432) de la de runtime (:6543) y verificar SCRUM-123 en Vercel.
- **Criterios de aceptación:**
  - TLS con la CA de Supabase (`verify-full`).
  - `DATABASE_URL_MIGRATIONS` (:5432) para drizzle-kit; runtime en :6543 en Production y Preview (`vercel env ls`).

#### CAMP-051 · [Media] Infra: las funciones corren en EE.UU. Este y la base está en EE.UU. Oeste, lejos de Córdoba

- **Tipo:** Tarea (Task) · **Prioridad:** Medium · **Épica:** E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `mod-infra`, `could`
- **Orígenes:** DEV-006, BA-032 (latencia)
- **Bloqueado por:** No
- **Descripción:** `vercel.json` fija `iad1` y la base está en `us-west-2`: cada query cruza el continente y suma latencia para usuarios en Córdoba.
- **Criterios de aceptación:**
  - Región de funciones alineada con la base (o la base migrada a `sa-east-1` junto con las funciones en `gru1`).
  - Medición antes y después del tiempo de carga de Pagos y Notas.

#### CAMP-052 · [Media] Autoevaluaciones IA: la generación no tiene cuota ni timeout, no valida el JSON y bloquea la toma de asistencia

- **Tipo:** Bug (Bug) · **Prioridad:** Medium · **Épica:** E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-autoevaluaciones`, `could`
- **Orígenes:** DEV-016
- **Bloqueado por:** No
- **Descripción:** La llamada a la API de Claude no tiene timeout ni límite por curso, el JSON del modelo no se valida con Zod y la generación automática corre dentro de la toma de asistencia.
- **Criterios de aceptación:**
  - Timeout y cuota por curso/día; el JSON se valida con Zod y un error se informa en español.
  - La generación automática corre fuera del request de asistencia (en segundo plano).

#### CAMP-053 · [Media] Rendimiento: medir y asegurar tiempos de respuesta con 5 usuarios concurrentes

- **Tipo:** Tarea (Task) · **Prioridad:** Medium · **Épica:** E6 · QA-2026-10 · Rendimiento e infraestructura (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `mod-infra`, `defensa-tesis`, `could`
- **Orígenes:** BA-032
- **Bloqueado por:** No
- **Descripción:** RNF de operación en mostrador: Pagos, Notas y Reportes deben cargar en segundos con 3 administrativas y 2 docentes a la vez. Se mide antes y después de los fixes de infraestructura.
- **Criterios de aceptación:**
  - Medición documentada con 5 sesiones concurrentes: cada pantalla carga en menos de 3 s (umbral a validar con el cliente).
  - Resultado incorporado como evidencia del RNF en la documentación.

#### CAMP-054 · [Baja] Crons/Notificaciones: envíos duplicados y la opción "Horas de anticipación" no tiene efecto

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-qa1`, `mod-notificaciones`, `mod-automatizaciones`, `could`
- **Orígenes:** DEV-041, QA1-010 · **Jira relacionado:** SCRUM-221
- **Bloqueado por:** No
- **Descripción:** Correr un cron dos veces el mismo día duplica la tanda; no hay throttling ni `maxDuration`. `timingHours` se guarda pero nadie lo lee, y hay tres textos distintos sobre cuándo sale el recordatorio.
- **Criterios de aceptación:**
  - Idempotencia por día y tipo de envío; throttling hacia Resend; `maxDuration` en los crons.
  - `timingHours` cambia el comportamiento o se elimina, y los textos dicen una sola cosa.

#### CAMP-055 · Administrativo/Pagos: reactivar al alumno que regulariza su deuda

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E3 · QA-2026-10 · Cobranza y automatizaciones confiables (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-pagos`, `bloqueado-cliente`, `could`
- **Orígenes:** BA-009
- **Bloqueado por:** I-06
- **Descripción:** Como administrativa quiero que, al cobrarle la deuda a un alumno suspendido, el sistema lo reactive (o le pida a Dirección que lo haga), para que no quede suspendido por olvido.
- **Criterios de aceptación:**
  - Al no quedar cuotas con más de 30 días de mora, el alumno pasa a `active` automáticamente o Dirección recibe "X regularizó su deuda: ¿reactivar?" (según I-06).
  - La reactivación registra quién y cuándo.

#### CAMP-056 · [Baja] Inscripciones: se puede inscribir a un alumno suspendido o en un curso cerrado

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-dev`, `regla-negocio`, `mod-inscripciones`, `could`
- **Orígenes:** DEV-021, BA-012
- **Bloqueado por:** No
- **Descripción:** `validateAndCreateEnrollment` no mira el estado del alumno ni del curso.
- **Criterios de aceptación:**
  - Alumno suspendido o restringido: "El alumno tiene deuda pendiente: regularizá antes de inscribir".
  - Alumno inactivo o egresado: se pide confirmar el reingreso.
  - Curso inactivo o completado: no aparece en el selector y el POST se rechaza.

#### CAMP-057 · Pagos: controlar en el servidor el vencimiento el día 10

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-pagos`, `bloqueado-cliente`, `could`
- **Orígenes:** BA-017, SCRUM-240 (V3) · **Jira relacionado:** SCRUM-240
- **Bloqueado por:** Q-05
- **Descripción:** Como Directora quiero que las cuotas venzan el día 10, para que la mora se calcule igual para todos. Hoy el 10 es solo un valor por defecto.
- **Criterios de aceptación:**
  - Un vencimiento distinto del 10 pide confirmación y motivo (o se rechaza, según Q-05).
  - La generación de cuotas (CAMP-026) usa el día 10.

#### CAMP-058 · Administrativo/Alertas: avisar a administración y al docente cuando un alumno falta 2 veces seguidas

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `origen-po`, `regla-negocio`, `mod-asistencia`, `mod-notificaciones`, `could`
- **Orígenes:** BA-022, PO-009 (ausentes)
- **Bloqueado por:** No
- **Descripción:** Como administrativa quiero recibir el aviso de 2 ausencias seguidas de un alumno, porque soy quien se comunica con la familia.
- **Criterios de aceptación:**
  - Al registrarse la segunda ausencia consecutiva, notifican Dirección, las administrativas y el docente del curso.
  - Si el alumno es menor, el aviso indica contactar al tutor.

#### CAMP-059 · [Baja] Validaciones y redirecciones menores en varios módulos

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-pagos`, `mod-cursos`, `mod-reclamos`, `mod-marketing`, `could`
- **Orígenes:** DEV-045 · **Jira relacionado:** SCRUM-252, SCRUM-253
- **Bloqueado por:** No
- **Descripción:** Conjunto de fixes S: `updateInquiryStatusAction` sin Zod; `createComplaintAction` sin `requireRole`; no se puede quitar aula/especialización ("" → null); `maxCapacity` menor que los inscriptos; dos cuotas del mismo alumno y vencimiento; `STATUS_LABELS` sin "Anulado" en el Excel; `getUser()` en una action; se re-notifica "Nota publicada" en cada edición. (Los `redirectTo` fijos van en SCRUM-253 y QuizPlayer en SCRUM-256.)
- **Criterios de aceptación:**
  - Cada punto de la lista de DEV-045 resuelto o descartado con motivo.
  - Índice único parcial `(student_id, due_date) WHERE status <> 'cancelled'`.

#### CAMP-060 · [Baja] Emails: caracteres cirílicos en los textos y HTML sin escapar

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-dev`, `mod-notificaciones`, `could`
- **Orígenes:** DEV-044
- **Bloqueado por:** No
- **Descripción:** Hay letras cirílicas mezcladas en plantillas (se ven bien pero son otros caracteres) y los valores se interpolan en el HTML sin escapar.
- **Criterios de aceptación:**
  - `grep -P "[\x{0400}-\x{04FF}]" src` no devuelve nada.
  - Los valores interpolados en emails se escapan.

#### CAMP-061 · [Baja] Director/Cursos: hay cursos con cupo 20 y editarlos baja el cupo a 15 sin avisar

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E4 · QA-2026-10 · Integridad de datos y formularios (nueva) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `regla-negocio`, `mod-cursos`, `bloqueado-cliente`, `could`
- **Orígenes:** QA1-021
- **Bloqueado por:** Decisión de la Directora sobre los cursos con cupo 20
- **Descripción:** La DB no tiene CHECK de cupo y `CourseForm` reemplaza cualquier valor mayor a 15 por 15 en silencio: guardar otro cambio reduce el cupo de un curso real (Adults 4).
- **Criterios de aceptación:**
  - Decidir con la Directora qué hacer con los cursos de 20.
  - El formulario nunca cambia el cupo sin mostrarlo; migración `CHECK (max_capacity BETWEEN 1 AND 15)` si se mantiene la regla.

#### CAMP-062 · Director: menú agrupado por secciones y con nombres que no se confundan

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-po`, `mod-ui`, `could`
- **Orígenes:** PO-001
- **Bloqueado por:** No
- **Descripción:** Como Directora quiero un menú corto y agrupado. Hoy son 23 ítems planos, "Comunicaciones" y "Notificaciones" parecen lo mismo, Cursos y Material comparten ícono y "Administrativos" es un filtro de Usuarios.
- **Criterios de aceptación:**
  - Secciones Académico, Administración, Gestión y Configuración.
  - "Notificaciones" (configuración) pasa a "Alertas automáticas", con ícono propio; Material tiene un ícono distinto de Cursos.

#### CAMP-063 · [Baja] Textos: plurales y espacios mal armados en varias pantallas

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `origen-qa2`, `mod-ui`, `could`
- **Orígenes:** QA1-006, QA1-007, QA2-003
- **Bloqueado por:** No
- **Descripción:** "evaluaciónes", "comunicaciónes", "Últimas 1 clases registradas" y "Hay 3alumno(s) apto(s)": el plural se arma agregando "es" y falta un espacio.
- **Criterios de aceptación:**
  - Helper `plural(n, singular, plural)` usado en notas, comunicaciones, asistencia y cierre de ciclo de los 3 portales.
  - Textos correctos para 0, 1 y N.

#### CAMP-064 · [Baja] Director/Reportes: porcentajes y fechas del Excel salen como texto y los formatos se mezclan

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `mod-reportes`, `could`
- **Orígenes:** QA1-011
- **Bloqueado por:** No
- **Descripción:** "% Asistencia" se exporta como texto, las fechas como string, la pantalla mezcla punto y coma decimal, la proyección se grafica con un solo mes y los archivos no llevan fecha.
- **Criterios de aceptación:**
  - Excel con valores numéricos y de fecha con formato; pantalla en es-AR; nombre de archivo con fecha.
  - La proyección se oculta o se explica con menos de 2 meses de datos.

#### CAMP-065 · [Baja] Auth: mensajes de requerido genéricos, 403 sin branding y link de invitación malformado con error crudo

- **Tipo:** Bug (Bug) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-qa1`, `mod-auth`, `mod-ui`, `could`
- **Orígenes:** QA1-018
- **Bloqueado por:** No
- **Descripción:** Login vacío dice "Email inválido"; /403 no tiene el branding y a un usuario sin sesión le dice "No tenés permisos"; `/invite/%%%` devuelve un 400 del framework.
- **Criterios de aceptación:**
  - Mensajes de requerido específicos; /403 con el mismo branding que la 404 y redirección al login sin sesión; link malformado con página "Link inválido".

#### CAMP-066 · Administrativo: consultar cursos, horarios y vacantes antes de inscribir

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S
- **Labels:** `qa-2026-10`, `origen-po`, `mod-cursos`, `mod-inscripciones`, `could`
- **Orígenes:** PO-007
- **Bloqueado por:** No
- **Descripción:** Como administrativa quiero ver horario, docente y vacantes de cada curso, para responder "¿hay lugar el martes a la tarde?" sin probar inscribiendo. Hoy Cursos le da 403.
- **Criterios de aceptación:**
  - Vista de solo lectura `/administrativo/courses` con horario, docente, ocupación y (cuando exista) lista de espera.

#### CAMP-067 · Director/Administrativo: paginación y filtros en los listados

- **Tipo:** Historia (Story) · **Prioridad:** Medium · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-dev`, `origen-po`, `mod-ui`, `could`
- **Orígenes:** PO-004, DEV-046 (sin paginación)
- **Bloqueado por:** No
- **Descripción:** Como administrativa quiero listas paginadas y con filtros, porque con datos reales (cientos de alumnos y miles de cuotas) las listas se vuelven inusables. Ningún listado pagina y solo Alumnos tiene búsqueda.
- **Criterios de aceptación:**
  - Paginación del lado del servidor en Alumnos, Pagos, Inscripciones, Notas, Comunicaciones y Usuarios.
  - Filtros por estado y curso en Pagos, Inscripciones y Notas; búsqueda por alumno en Pagos.

#### CAMP-068 · Administrativo: dashboard con la agenda del día

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-po`, `mod-ui`, `could`
- **Orígenes:** PO-009
- **Bloqueado por:** No
- **Descripción:** Como administrativa quiero que mi panel me diga qué hacer hoy, no los mismos KPIs que el director.
- **Criterios de aceptación:**
  - Bloques "Cobros de hoy", "Vencen esta semana", "Morosos a contactar" (con teléfono) y "Ausentes de hoy".

#### CAMP-069 · Profesor: enviar un aviso a los alumnos de mi curso

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-po`, `mod-notificaciones`, `could`
- **Orígenes:** PO-012
- **Bloqueado por:** No
- **Descripción:** Como docente quiero avisar a mi curso ("mañana no hay clase") desde el sistema y no por WhatsApp.
- **Criterios de aceptación:**
  - El profesor envía notificaciones solo a alumnos de sus cursos, validado con el helper de propiedad.

#### CAMP-070 · Director/Evaluación docente: corregir observaciones de clase y ver el cumplimiento del cuatrimestre

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** S-M
- **Labels:** `qa-2026-10`, `origen-ba`, `mod-eval-docentes`, `could`
- **Orígenes:** BA-026, D-05 (hallazgos.md)
- **Bloqueado por:** No
- **Descripción:** Como Directora quiero corregir una observación mal cargada y ver qué docentes no tienen sus 2 observaciones del cuatrimestre.
- **Criterios de aceptación:**
  - Edición y baja de observaciones, con registro del cambio.
  - El listado de docentes muestra "1/2" o "2/2" observaciones del cuatrimestre.

#### CAMP-071 · Notas: promedio ponderado por tipo de evaluación

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-notas`, `bloqueado-cliente`, `could`
- **Orígenes:** BA-023
- **Bloqueado por:** Q-02
- **Descripción:** Como Directora quiero que el final pese más que una tarea, para que el promedio refleje el criterio pedagógico.
- **Criterios de aceptación:**
  - Pesos configurables por Dirección y promedio ponderado; redistribución si falta un tipo.
  - Si el cliente mantiene el promedio simple, se corrige el Encuentro 2 §4.2.

#### CAMP-072 · Cursos: aulas y franja horaria del instituto

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-cursos`, `could`
- **Orígenes:** BA-024
- **Bloqueado por:** No
- **Descripción:** Como Directora quiero que el sistema no permita dos cursos en la misma aula a la misma hora ni fuera del horario del instituto.
- **Criterios de aceptación:**
  - Selector de aulas; rechazo de superposición indicando el curso en conflicto; validación de franjas 8–13 y 15–21.

#### CAMP-073 · Inscripciones: recursado con descuento y cambio de grupo

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E2 · Ajustes de negocio: reglas del cliente (SCRUM-191) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `regla-negocio`, `mod-inscripciones`, `bloqueado-cliente`, `could`
- **Orígenes:** BA-021, C-02/C-03 (hallazgos.md)
- **Bloqueado por:** I-05
- **Descripción:** Como administrativa quiero registrar el recursado (con su descuento) y el cambio de grupo sin perder la historia del alumno.
- **Criterios de aceptación:**
  - Inscripción como "Recursante" con el descuento definido.
  - En un cambio de grupo, la asistencia y las notas previas se conservan y cuentan.

#### CAMP-074 · Alumnos: historial académico unificado en la ficha

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-ba`, `mod-alumnos`, `could`
- **Orígenes:** BA-028
- **Bloqueado por:** No
- **Descripción:** Como administrativa quiero ver en la ficha del alumno sus cursos, asistencia, notas, pagos y certificados, para atenderlo en el mostrador sin abrir cinco pantallas.
- **Criterios de aceptación:**
  - La ficha muestra por inscripción % de asistencia, promedio y estado de promoción, además de los pagos.

#### CAMP-075 · Todos: un patrón único de cabeceras, botones de formulario y acciones de fila

- **Tipo:** Historia (Story) · **Prioridad:** Low · **Épica:** E5 · UX y experiencia por rol (SCRUM-194) · **Sprint:** Backlog · **MoSCoW:** Could · **Esfuerzo:** M
- **Labels:** `qa-2026-10`, `origen-qa1`, `mod-ui`, `could`
- **Orígenes:** QA1-013
- **Bloqueado por:** No
- **Descripción:** Como usuario quiero que todas las pantallas se comporten igual. Hoy el orden de botones se invierte entre formularios, el back link aparece solo en algunos, hay tablas con "Ver →" en lugar del ícono Eye y encabezados en dos estilos.
- **Criterios de aceptación:**
  - Guía corta de patrones en `docs/CONVENCIONES.md` (cabecera, botones de formulario, back link, acción de fila).
  - Los formularios y tablas listados en QA1-013 la cumplen.

---

## 4. Acciones sobre tickets existentes

Todas son propuestas para ejecutar en Jira después de la revisión. La evidencia es la del día de hoy (13/10).

### 4.1 Cerrar

| Ticket | Evidencia | Cómo cerrarlo |
|---|---|---|
| SCRUM-238 Playwright 1.61 + Node 22.15 | `@playwright/test ^1.62.1` (Dependabot `f3612f2`). `playwright@1.62.1/lib/transform/esmLoader.js:7642,7667` maneja `conditions` como Set. No queda `patches/` | Finalizado, con comentario. Confirmar con `pnpm test:e2e` después de un `pnpm install` limpio, ya contra el proyecto de test de CAMP-004 |
| SCRUM-186 Edad mínima 6 años | `students/schemas.ts:11` `birthDateField(6)` (`b7fa569`) | Finalizado |
| SCRUM-151 Workflow base de CI | `.github/workflows/ci.yml` | Finalizado |
| SCRUM-152 Typecheck en CI | `ci.yml:55` `pnpm tsc --noEmit` | Finalizado |
| SCRUM-153 ESLint en CI | `ci.yml:31` `pnpm lint` (0 errores y 0 warnings según DEV §0) | Finalizado |
| SCRUM-157 Schedule diario E2E | `e2e-daily.yml:11-12` `cron: "0 6 * * *"` | Finalizado |
| SCRUM-158 Completar specs E2E | `4b71c22`: suite de 162 tests sobre los 4 portales | Finalizado |
| SCRUM-154 E2E en CI "contra producción" | `4b71c22` lo cambió a build local + base de test | Actualizar el título ("contra build local y base de test") y cerrarlo |
| SCRUM-239 Supabase de dev se auto-pausa | Lo absorbe CAMP-004 (proyecto de test separado) | Cerrar como **duplicado** de CAMP-004 |
| Épicas SCRUM-128, 167, 170, 195 | Todos sus hijos están Finalizado | Finalizado |
| Épica SCRUM-150 CI/CD | Queda abierta solo por 155 y 156 | Cerrar cuando se cierren 155 y 156 |

### 4.2 Verificar antes de decidir

| Ticket | Qué verificar | Resultado esperado → acción |
|---|---|---|
| SCRUM-123 `DATABASE_URL` de preview en 5432 (Finalizado) | `vercel env ls`. El conector de Vercel no está autorizado en esta sesión, así que nadie lo pudo verificar (DEV-008) | Si Preview o Production siguen en `:5432`: **reabrir** y vincular con CAMP-050. Si están en `:6543`: comentar la evidencia |
| SCRUM-156 GitHub Secrets | Que existan `SUPABASE_TEST_*` y `DATABASE_TEST_URL`, **y que apunten al proyecto de test nuevo** (hoy apuntarían a producción, por DEV-005) | Cerrar después de CAMP-004 |
| SCRUM-155 Usuario dedicado E2E | Los usuarios `@e2e.test` existen, pero en producción y con la contraseña versionada | Actualizar: "bloqueado por CAMP-004". Cerrar cuando vivan solo en el proyecto de test |
| SCRUM-124 Avatar en el detalle de usuario (Finalizado) | En código está resuelto (`director/users/[id]/page.tsx:73-76`). La subida no se pudo probar por la restricción de solo lectura | Comentar la evidencia. Volver a probar de punta a punta en el entorno de test |
| SCRUM-122 Badge de no leídas (Finalizado) | QA2 lo verificó en desktop y en mobile | Comentar la verificación. No requiere acción |

### 4.3 Reabrir

**Ninguno.** Los tickets cerrados cuyo problema sigue presente son historias que se entregaron con un defecto de diseño o con un efecto colateral. Se crea un bug nuevo y se vincula (§4.4), para no reescribir la historia de los sprints cerrados ni las métricas. La única excepción posible es SCRUM-123, si la verificación de §4.2 da 5432.

### 4.4 Vincular (cerrado ↔ ítem nuevo o reusado)

| Ticket cerrado | Vínculo | Con | Motivo |
|---|---|---|---|
| SCRUM-207 Alerta de morosidad | relates to | CAMP-019, CAMP-023 | Ningún proceso pasa a `overdue`; las alertas comparten la marca |
| SCRUM-209 Bloqueo por morosidad | relates to | CAMP-040, CAMP-019 | No es automático ni se levanta al pagar |
| SCRUM-210 Alerta de asistencia 70% | relates to | CAMP-045, SCRUM-190 | Umbral distinto del de promoción |
| SCRUM-214 Riesgo de abandono | relates to | CAMP-041 | La intervención se pierde |
| SCRUM-218, 219, 220 Alertas por email y crons | relates to | CAMP-039, CAMP-006, CAMP-054 | Fallos no detectados, cron sin secreto, envíos duplicados |
| SCRUM-221 Configuración de alertas | relates to | CAMP-054 | `timingHours` no tiene efecto (QA1-010) |
| SCRUM-232 Asistencia duplicada | relates to | CAMP-042 | Alertas e IA disparadas dos veces |
| SCRUM-133, 193, 229 Autoevaluaciones del docente | relates to | CAMP-014 | El docente opera sobre cursos ajenos |
| SCRUM-131 Evaluaciones IA con documentos | relates to | SCRUM-189 | El material es global y no por curso |
| SCRUM-93 E2E alta de curso | **is regressed by** (o "relates to" con el label `regresion`) | SCRUM-236 | El alta de curso se rompió después |
| SCRUM-137 Renombrar admin → director | relates to | SCRUM-241, SCRUM-259 | Quedaron usos residuales de `admin` |
| SCRUM-174, 196 Invitar usuarios | relates to | CAMP-002 | El flujo de invitación es el vector de DEV-001 |
| SCRUM-172 RLS para administrativo | relates to | CAMP-012, CAMP-007 | RLS expone de más (`USING true`) y oculta los reclamos al staff |
| SCRUM-173 proxy.ts para administrativo | relates to | CAMP-013 | Decide con `user_metadata` y usa una lista negra incompleta |

### 4.5 Actualizar los tickets que se reusan

Para cada uno: cambiar la prioridad, asignar la épica y el sprint, agregar los labels `qa-2026-10`, `origen-*` y MoSCoW, y dejar un comentario con el cambio de alcance y los IDs de origen. Los labels `severidad-*` se mantienen por compatibilidad.

| Ticket | Prioridad nueva | Épica | Sprint | Cambio de alcance / comentario a dejar |
|---|---|---|---|---|
| SCRUM-236 No se puede crear un curso | High | E4 | 10 | Ampliar: además del SchedulePicker, "Sin asignar" da "Invalid UUID" en el alta y los mensajes de Zod salen en inglés (configurar `z.locales.es()`). Labels `regresion`. |
| SCRUM-252 No se puede desasignar el docente | Medium | E4 | 10 | Mismo helper `emptyToUndef` que SCRUM-236; en la edición, "" → null para poder quitar el docente. |
| SCRUM-235 Alta de alumno bloqueada si no se elige nivel | High | E4 | 10 | Ampliar: el texto "el nivel se asigna automáticamente" no tiene lógica; sugerir el nivel desde el puntaje o cambiar el texto. |
| SCRUM-241 Comunicaciones: opción role:admin | Medium | E5 (SCRUM-194) | 10 | Ampliar: las opciones salen del enum (director, administrativo, profesor, alumno) y el schema valida el rol. Hoy enviar a "Administradores" lanza y muestra la pantalla de error. |
| SCRUM-242 Editar nombre/teléfono no persiste | High | E4 | 11 | Sin cambio de alcance. Prioridad High y primer ítem del Sprint 11 (fue parte del incidente). |
| SCRUM-243 placementTestScore nunca se guarda | High | E4 | 11 | Sin cambio de alcance. |
| SCRUM-188 Escala de notas 0-100 | High | E2 (SCRUM-191) | 11 | Ampliar: `grades.score` es `numeric(4,2)` (máx. 99,99): requiere migración de tipo a `numeric(5,2)` además de `score × 10`; nota mínima 70 desde una constante única en los 7 lugares de BA §4.2. |
| SCRUM-190 Asistencia mínima 70% | High | E2 (SCRUM-191) | 11 | Ampliar: misma constante en Promociones, Cierre, Reportes, colores y emails. Registrar la decisión Q-01 (tardanza). |
| SCRUM-248 Promoción sin revalidar elegibilidad | High | E2 (SCRUM-191) | 11 | Ampliar: quitar "Completado" del ABM de inscripciones y listar para Dirección las inscripciones ya completadas sin cumplir requisitos. |
| SCRUM-244 Reactivar inscripción saltea cupo | High | E2 (SCRUM-191) | 11 | Sin cambio de alcance. |
| SCRUM-249 markAsPaid resucita pagos anulados | High | E3 | 11 | Ampliar: `updatePaymentStatus` solo permite las transiciones del diagrama de estados del Encuentro 6 §1.3; tampoco se cobra dos veces un pago `paid`. |
| SCRUM-245 Reportes Excel: 403 para administrativo | High | E5 (SCRUM-194) | 11 | Decisión del PO: habilitar los 3 reportes al administrativo (I-08). Si la Directora dice que no, ocultar los botones. |
| SCRUM-246 IDOR: profesor carga notas ajenas | High | E1 | 11 | Ampliar: helper `assertTeacherOwnsCourse` compartido con CAMP-014; rechazar notas en inscripciones withdrawn/completed para el docente. |
| SCRUM-247 Director se auto-desactiva | Medium | E1 | 12 | Ampliar: cambiar el rol sincroniza `app_metadata`/`user_metadata`, crea la ficha correspondiente y siempre queda al menos un director activo. |
| SCRUM-251 Autoevaluación sin guard de intento duplicado | High | E1 | 12 | Ampliar: el alumno no puede abrir ni responder autoevaluaciones de cursos en los que no está inscripto; los duplicados ya no rompen la página de resultado (índice único). |
| SCRUM-250 Encuesta "anónima" guarda enrollmentId | High | E1 | 12 | Ampliar: registro de "ya respondió" separado de las respuestas y ocultar el detalle con menos de 3 respuestas. |
| SCRUM-260 Fechas con un día de menos | High | E4 | 11 | Ampliar y subir a High: además del display (profesor y alumno ven fechas distintas para la misma clase), "hoy" se calcula en UTC (DEV-032). Helpers `fmtDateOnly`, `fmtDateTimeAR`, `todayAR`, regla de ESLint y tests con TZ AR y UTC. |
| SCRUM-253 Administrativo cae en /director | Medium | E5 (SCRUM-194) | 12 | Ampliar a alumnos, inscripciones, pagos, notas y recibos, y al portal profesor (GradeList → `/profesor/grades/[id]`). `portalBase(role)` / `usePortalBase()`. |
| SCRUM-234 Borrar desde el detalle → 404 | Medium | E4 | 11 | Se resuelve junto con CAMP-016 (baja lógica, DEV-019): `redirect()` server-side en todas las entidades. |
| SCRUM-240 Validaciones de fecha faltantes | Medium | E2 (SCRUM-191) | 13 | Mantener V1, V2 y V5 con "hoy" en hora AR. V3 (día 10) pasa a CAMP-057. |
| SCRUM-254 Estado de reclamo no revalida el detalle | Medium | E5 (SCRUM-194) | 13 | Sin cambio. Se hace junto con la historia de respuesta a reclamos. |
| SCRUM-256 QuizPlayer ignora el error del envío | Medium | E5 (SCRUM-194) | 13 | Sin cambio de alcance. |
| SCRUM-257 Forms de estado sin toast de éxito | Low | E5 (SCRUM-194) | Backlog | Sin cambio de alcance. |
| SCRUM-258 Validaciones menores | Low | E4 | Backlog | Quitar la parte de asistencia (pasa a CAMP-042). |
| SCRUM-237 Warning `error` en elementos DOM | Low | E6 | Backlog | Sin cambio de alcance. |
| SCRUM-259 Código obsoleto/muerto | Low | E6 | Backlog | Reorientar: `registerAction` pasa a CAMP-003 y el egreso a CAMP-044; absorbe DEV-046 (services muertos, duplicación entre portales, `server-only`, `bodySizeLimit`). |
| SCRUM-139 Tablas → cards en mobile | Medium | E5 (SCRUM-194) | 13 | Priorizar Promociones y Cierre de ciclo (botón "Promover" fuera de pantalla). |
| SCRUM-189 Material de estudio en cursos | High | E5 (SCRUM-194) | 13 | Ampliar: `documents.course_id`, selector de curso, el alumno ve solo lo de sus cursos e institucional, bucket privado con URLs firmadas, el autor puede dar de baja (según Q-06). |
| SCRUM-233 Lista de espera | Low | E2 (SCRUM-191) | Backlog | Bloqueado por I-04. |
| SCRUM-180 Métodos de pago con descuentos | Medium | SCRUM-178 | Backlog | Bloqueado por I-02. Queda en la épica SCRUM-178. |
| SCRUM-181 Matrícula en inscripciones | Low | SCRUM-178 | Backlog | Bloqueado por I-03. |
| SCRUM-179 Cuota mensual por curso | Low | SCRUM-178 | Backlog | Bloqueado por I-03. El MVP sin precio por curso es CAMP-026. |

### 4.6 Comentar (sin cambiar el estado)

| Ticket | Comentario |
|---|---|
| SCRUM-240 Validaciones de fecha | La V3 (día 10) pasa a CAMP-057. V1 se relaciona con CAMP-042 y CAMP-043 |
| SCRUM-258 Validaciones menores | La parte de asistencia (estado sin validar) pasa a CAMP-042 |
| SCRUM-259 Código muerto | `registerAction` pasa a CAMP-003 y el egreso a CAMP-044. Absorbe DEV-046 |
| SCRUM-255 Marketing sin contacto | Queda en espera de CAMP-033. Si se oculta Marketing, pasa a **Won't do** |
| SCRUM-187 Eliminar Marketing | Se resuelve con CAMP-033 (decisión I-09) |
| SCRUM-233, 180, 181, 179 | Bloqueados por I-04, I-02, I-03 y I-03. Vincular con CAMP-010 (reunión con la Directora) y agregar `bloqueado-cliente` |
| SCRUM-191 y SCRUM-194 | Pasan a ser las épicas E2 y E5 de la campaña: agregar `qa-2026-10` y actualizar la descripción con el objetivo |
| SCRUM-206 y SCRUM-215 | Mantener abiertas hasta cerrar CAMP-019, 023, 039, 040 y 054. Vincularlas |

### 4.7 Gestión del tablero

1. **Cerrar el Sprint 9** (CAMP-011). Sus 10 issues pasan a los sprints de §5: 235, 236 y 252 al 10; 242, 243, 244, 246, 248 y 249 al 11; 247 al 12.
2. **Crear 5 épicas:**
   - E1 · Seguridad y datos de producción
   - E3 · Cobranza y automatizaciones confiables
   - E4 · Integridad de datos y formularios
   - E6 · Rendimiento e infraestructura
   - E7 · Defensa y documentación

   E2 y E5 son SCRUM-191 y SCRUM-194.
3. **Crear los sprints 10 a 13** con los objetivos de §5 y cargar los story points (S = 2, S-M = 3, M = 5).
4. **Aplicar la prioridad de Jira** a los 27 tickets `qa-e2e` según §4.5. Hoy todos están en `Medium`.
5. **Excluir SCRUM-159** (`[TEMPLATE]`) del board con el filtro `labels != template`.
6. **Historias retroactivas** (label `retroactivo`, creadas y cerradas en el sprint en que se hizo el trabajo), según `po-jira-y-producto.md §2.4`:
   - Corrección y baja de asistencia (`d3a0786`).
   - Edición y anulación de pagos (`5af96a5`).
   - Reportes con análisis descriptivo, diagnóstico y predictivo (`3e1f8b2`).
   - Panel de automatizaciones (`03196c4`).
   - Migración de los formularios a React Hook Form + Zod (`2a6c515`, `f90a2d6`).
   - Suite E2E de 162 tests con seed determinístico (`4b71c22`).
7. **Vincular el incidente:** CAMP-001 "is caused by" CAMP-008, CAMP-016, SCRUM-242 y CAMP-004.

---

## 5. Plan de sprints

**Capacidad de referencia.** Los sprints 6 a 8 entregaron 81, 69 y 48 SP (promedio de 66 SP cada 2 semanas). El Sprint 9 comprometió 23 SP y entregó 0. El plan usa unos 33 SP por semana y deja un margen. Si la velocidad real del Sprint 10 resulta menor, **se recorta el Sprint 12 a los ítems `defensa-tesis`** y el resto pasa al 13.

### Sprint 10 · "Producción segura" (1 semana, ~37 SP, Must)

**Objetivo:** que nadie pueda tomar cuentas ni escalar permisos, que las pruebas dejen de tocar producción, que la alumna borrada se restaure y que los flujos core vuelvan a funcionar.

| Orden | Ítem | Esf. | Nota |
|--:|---|---|---|
| 0 | **CAMP-001** Restaurar la alumna borrada | S | Primero, apenas lo autorice el responsable. En Free no hay PITR: lo más probable es el reinsert manual en una transacción |
| 1 | **CAMP-003** (parte sin código) | — | Hoy: deshabilitar signups y correr el REVOKE / DROP POLICY de DEV-002 |
| 1 | **CAMP-004** (parte urgente) | — | Hoy: banear las cuentas `@e2e.test` y `e2e-*` en producción y frenar las escrituras de QA |
| 1 | **CAMP-006** (parte sin código) | — | Hoy: cargar `CRON_SECRET` en Vercel |
| 2 | **CAMP-005** `max_pipeline: 0` (DEV-047) | S | Una línea más el reinicio del dev server, en una ventana acordada |
| 3 | **CAMP-002** Invitaciones con token (DEV-001) | M | La mitigación (rechazar cuentas activas) va el primer día |
| 4 | **CAMP-004** Proyecto Supabase de test separado | M | Bloquea cualquier retest de escritura y CAMP-034 (demo) |
| 5 | **CAMP-003** completo (DEV-002) | S-M | `loginAction` sin rol de metadata, se elimina `registerAction` y se agrega el test de regresión |
| 6 | **CAMP-006** `assertCron()` (DEV-028) | S | |
| 7 | **CAMP-007** Reclamos visibles para el staff (QA2-013) | S | Fix S que destraba un flujo |
| 8 | **SCRUM-236 + SCRUM-252** Alta de curso y "Sin asignar" (QA1-014) | S+S | Mismo helper `emptyToUndef` y locale de Zod en español |
| 9 | **SCRUM-235** Alta de alumno sin nivel (QA1-015) | S | Mismo patrón |
| 10 | **CAMP-009** `signOut({ scope: "local" })` (QA1-022) | S | Fix S que destraba sesiones compartidas |
| 11 | **SCRUM-241** Rol "Administradores" inexistente (QA2-007) | S | Fix S que destraba el envío de comunicaciones |
| 12 | **CAMP-008** Buscador de alumnos (QA1-024) | S | Fix S y causa del incidente |
| — | **CAMP-010** Reunión con la Directora (I-01..I-09, Q-01..Q-06) | S | PO/BA, no consume desarrollo. Destraba 12 ítems |
| — | **CAMP-011** Cerrar el Sprint 9, retrospectiva y métricas | S | PO/SM |

**Definition of Done (campaña):** fix aplicado con validación del lado del servidor donde corresponda; el `test.fail` asociado, si existe, pasa en verde; probado contra el **proyecto de test** (nunca contra producción); `pnpm tsc --noEmit`, `pnpm lint` y `pnpm test` en verde.

### Sprint 11 · "Reglas del cliente y datos sin pérdidas" (2 semanas, ~67 SP, Must)

**Objetivo:** recupera el del Sprint 9. Que el servidor haga cumplir las reglas de la Directora y que ninguna operación pierda datos o "mienta éxito".

- **Seguridad de lectura y permisos:**
  - CAMP-012 RLS (DEV-003).
  - CAMP-013 Acceso del administrativo (DEV-004).
  - CAMP-014 y SCRUM-246, propiedad del docente con un helper común.
  - CAMP-015 Encuesta (DEV-012).
- **Datos sin pérdidas:**
  - SCRUM-242 primero.
  - SCRUM-243.
  - CAMP-016 Baja lógica, que resuelve también SCRUM-234.
  - CAMP-017 Caché.
  - CAMP-018 Corte de 1000 filas.
  - SCRUM-260 Fechas y "hoy" en hora AR.
- **Reglas del cliente:**
  - SCRUM-188 (0–100, con migración de `numeric(5,2)`).
  - SCRUM-190 (70%).
  - CAMP-021 Redondeo.
  - SCRUM-248 Promoción.
  - SCRUM-244 Reactivar inscripción.
  - SCRUM-249 Pago anulado.
- **Cobranza:**
  - CAMP-019 `overdue` automático.
  - CAMP-020 Estado efectivo único.
- **Portal administrativo:** SCRUM-245 Reportes.

Dependencias:
- SCRUM-188 y SCRUM-190 dependen de CAMP-010 solo por Q-01 (tardanza). La escala y los umbrales ya los decidió la Directora en mayo.
- CAMP-019 va antes de CAMP-020.

### Sprint 12 · "Cada rol, su día (y la defensa)" (2 semanas, ~63 SP, Must)

**Objetivo:** que cada rol vea lo que le importa y que la demo cuente la historia del producto.

- **Lo que quedó del Sprint 11:**
  - SCRUM-247 (al menos un director).
  - SCRUM-250 y SCRUM-251 (encuesta y autoevaluaciones).
  - SCRUM-253 (portal correcto para el administrativo y el profesor).
  - CAMP-022 (`error.tsx` y feedback).
  - CAMP-023 y CAMP-024 (mora).
  - CAMP-025 (cupo invisible).
- **Valor por rol (`defensa-tesis`):**
  - CAMP-026 Generar cuotas del mes.
  - CAMP-031 Dashboard del director.
  - CAMP-029 y CAMP-030 Panel docente y tomar lista directo.
  - CAMP-028 y CAMP-027 Panel del alumno.
  - CAMP-032 Recibos y certificados del alumno.
- **Defensa:**
  - CAMP-034 Datos de demo y guion. Depende de CAMP-004.
  - CAMP-035 Documentación alineada. Depende de SCRUM-188 y SCRUM-190.
  - CAMP-033 Decisión sobre Marketing.

### Sprint 13 · "Robustez y pulido" (2 semanas, ~65 SP, Should)

- **Seguridad media:**
  - CAMP-036 Respuestas del quiz.
  - CAMP-037 Uploads.
  - CAMP-038 Headers.
  - SCRUM-189 Material por curso y bucket privado.
- **Automatizaciones:**
  - CAMP-039 Fallos de email.
  - CAMP-040 Restricción por mora (I-06).
  - CAMP-041 Riesgo.
  - CAMP-045 Umbral de alerta (Q-04).
- **Reglas con decisión del cliente:**
  - CAMP-043 Quién toma asistencia (I-01).
  - CAMP-044 Ciclo lectivo y egreso (Q-03).
  - CAMP-042 Asistencia sin doble disparo.
  - SCRUM-240 Fechas.
- **UX:**
  - CAMP-046 Respuesta a reclamos, junto con SCRUM-254.
  - SCRUM-256.
  - SCRUM-139 y CAMP-047 (mobile).
  - CAMP-048 Vocabulario único.

### Backlog priorizado (Could)

Ordenado por valor:
1. CAMP-053 Medición de rendimiento con 5 usuarios (evidencia de RNF; conviene subirlo al 13 si se acerca la defensa).
2. CAMP-066 Cursos para el administrativo.
3. CAMP-067 Paginación.
4. CAMP-058 Aviso de 2 ausencias.
5. CAMP-055 Reactivación (I-06).
6. CAMP-050 y CAMP-051 TLS y región.
7. CAMP-052 IA con timeout.
8. CAMP-054 Crons idempotentes.
9. CAMP-056, 057, 059, 060 y 061 (reglas y validaciones menores).
10. CAMP-062 a 065 (textos y UX menor).
11. SCRUM-237, 257, 258 y 259 (deuda).
12. CAMP-068 a 075 (historias P3 y las bloqueadas por Q-02 e I-05).
13. SCRUM-233, 179, 180 y 181 (bloqueados por I-02, I-03 e I-04).


---

## 6. Ítems listos para crear por API (JSON)

Un objeto por ticket nuevo (CAMP-001 a CAMP-075). `issuetype` y `priority` usan los nombres de la API de Jira. `epic` es la épica de la campaña; `epic_key` es la clave existente (SCRUM-191 o SCRUM-194), o `null` si la épica hay que crearla primero (§4.7). `camp_id` y `sprint` son campos auxiliares: no se mandan a Jira tal cual. Los tickets existentes que se reusan **no** están acá: se actualizan según §4.5.

```json
[
  {
    "camp_id": "CAMP-001",
    "summary": "[Crítica] Director/Alumnos: restaurar la alumna real borrada durante el QA y su pago",
    "issuetype": "Task",
    "priority": "Highest",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "incidente",
      "mod-alumnos",
      "mod-pagos",
      "bloqueado-decision",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: INCIDENTE-2026-10-13, QA1-023 · docs/qa-2026-10/backlog-consolidado.md (CAMP-001)\nTipo: Tarea · Severidad: Crítica · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\nBloqueado por: Decisión del responsable del proyecto (método de restauración)\n\nEl 13/10 un script de QA borró en producción la fila de `students` de una alumna real (id 9a444b3f…) y, en cascada, 1 pago PAGADO de $15.000. `profiles` y auth quedaron huérfanos. Opciones: backup/PITR restaurado en un proyecto aparte (verificar el plan: en Free no hay backups) o reinsert manual con los mismos `id`, `profile_id`, `receipt_number` y fechas, en una transacción, invalidando después el tag `students`. No recrearla desde la UI (dispararía una invitación a la persona real).\n\nCriterios de aceptación:\n- La fila de `students` y el pago existen con sus ids originales.\n- La alumna entra a su portal y el pago figura en /director/payments y en los reportes.\n- Se registra en el incidente qué se restauró, cómo y quién lo autorizó."
  },
  {
    "camp_id": "CAMP-002",
    "summary": "[Crítica] Todos/Auth: el link de invitación permite entrar a cualquier cuenta, incluida la del director",
    "issuetype": "Bug",
    "priority": "Highest",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa1",
      "seguridad",
      "mod-auth",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: DEV-001, QA1-REF-01 · docs/qa-2026-10/backlog-consolidado.md (CAMP-002)\nTipo: Bug · Severidad: Crítica · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 10\n\nEl token de `/invite/[encoded]` es `base64url(email)`: no es secreto, no vence y no es de un solo uso. `claimInvite` toma el email del form y genera un link de recovery con la service role, así que cualquier visitante sin sesión entra como el dueño del email y le cambia la contraseña. Explotable hoy en producción.\n\nCriterios de aceptación:\n- Las invitaciones usan un token aleatorio de un solo uso, con vencimiento, guardado hasheado (migración `invitations`).\n- Una URL armada con base64(email) o un token usado/vencido muestra \"Link inválido\" y no genera sesión.\n- Mitigación inmediata: rechazar el claim de cuentas ya activas (`last_sign_in_at` no nulo).\n- Test que cubra el intento con base64(email)."
  },
  {
    "camp_id": "CAMP-003",
    "summary": "[Crítica] Todos/Auth: cualquier usuario puede darse el rol director (RLS de profiles y registro público abierto)",
    "issuetype": "Bug",
    "priority": "Highest",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "seguridad",
      "mod-auth",
      "mod-usuarios",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: DEV-002, SCRUM-259 (registerAction) · docs/qa-2026-10/backlog-consolidado.md (CAMP-003)\nTipo: Bug · Severidad: Crítica · MoSCoW: Must · Esfuerzo: S-M · Sprint propuesto: 10\nJira relacionado: SCRUM-259\n\nLa policy `authenticated_update_own_profile` no tiene `WITH CHECK` ni restricción de columnas: un alumno hace `profiles.update({role:'director'})` con su JWT y en el siguiente request es director (verificado con ROLLBACK). Además `disable_signup` está en false y `loginAction` crea perfiles con el rol de `user_metadata`. `registerAction` es un endpoint público muerto que crea alumnos huérfanos.\n\nCriterios de aceptación:\n- Deshabilitar signups en Supabase (sin código, hoy).\n- REVOKE de UPDATE/INSERT sobre `profiles.role` para `authenticated` y DROP/ajuste de las policies de INSERT/UPDATE (con WITH CHECK).\n- `loginAction` nunca toma el rol de `user_metadata`; se elimina `registerAction`/`registerSchema`.\n- Test de integración: con el JWT de un alumno, `profiles.update({role})` falla."
  },
  {
    "camp_id": "CAMP-004",
    "summary": "[Crítica] Infra: producción, dev y tests E2E comparten el mismo proyecto Supabase y la misma base",
    "issuetype": "Task",
    "priority": "Highest",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa1",
      "seguridad",
      "mod-infra",
      "must"
    ],
    "epic": "E6 · QA-2026-10 · Rendimiento e infraestructura",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: DEV-005, INCIDENTE-2026-10-13 (preventiva 1), BA-032 (entorno), SCRUM-239, SCRUM-155 · docs/qa-2026-10/backlog-consolidado.md (CAMP-004)\nTipo: Tarea · Severidad: Crítica · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 10\nJira relacionado: SCRUM-239, SCRUM-155, SCRUM-156\n\n`.env.local` y `.env.test` apuntan a producción: el seed E2E hace DELETE en producción, existen cuentas `@e2e.test` con contraseña versionada (incluida una director) y los QA escriben datos reales. Causa de infraestructura del incidente del 13/10.\n\nCriterios de aceptación:\n- Proyecto Supabase de test/dev separado, con las migraciones 0001-0013 aplicadas; `.env.local`, `.env.test` y los secrets de CI apuntan a él.\n- `scripts/seed-e2e.ts` aborta si la URL es la de producción; `TEST_PASSWORD` sale a una variable de entorno.\n- En producción: cuentas `@e2e.test` y `e2e-*` borradas o baneadas; contraseñas y `SUPABASE_SECRET_KEY` rotadas.\n- `select count(*) from profiles where email like '%@e2e.test'` en producción da 0."
  },
  {
    "camp_id": "CAMP-005",
    "summary": "[Alta] Todos: la app se cuelga cuando llegan dos consultas a la vez (conexión de Drizzle bloqueada)",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-po",
      "origen-qa1",
      "origen-qa2",
      "mod-infra",
      "must"
    ],
    "epic": "E6 · QA-2026-10 · Rendimiento e infraestructura",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: DEV-047, QA2-011, QA1-016 (cuelgue), PO-014 (parte técnica), DEV-042, E-01 (hallazgos.md) · docs/qa-2026-10/backlog-consolidado.md (CAMP-005)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\n\npostgres.js pipelinea las queries concurrentes sobre la única conexión (`max: 1`) y Supavisor en modo transacción (:6543) nunca les responde: todo el proceso queda colgado (skeleton infinito, portal alumno inutilizable, login del alumno que no termina). Aplica también en Vercel. Incluye la carrera de `Promise.all` en `courses/actions.ts` (DEV-042).\n\nCriterios de aceptación:\n- `src/lib/drizzle/index.ts` con `max_pipeline: 0` (y `max: 5` en desarrollo, `max_lifetime`).\n- Navegar las 11 pantallas del alumno 3 veces seguidas con 2-3 pestañas en paralelo, sin cuelgues; ninguna página Drizzle pasa de ~2 s.\n- Script de diagnóstico versionado (`scripts/diag-pipeline.cjs`).\n- Se corrige la memoria del proyecto y la nota de `docs/qa-backlog.md` sobre `Promise.all`."
  },
  {
    "camp_id": "CAMP-006",
    "summary": "[Alta] API/Crons: los endpoints de cron se pueden disparar sin secreto (en dev siempre; en prod si falta CRON_SECRET)",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa1",
      "seguridad",
      "mod-automatizaciones",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: DEV-028, QA1-009, E-04 (hallazgos.md) · docs/qa-2026-10/backlog-consolidado.md (CAMP-006)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\nJira relacionado: SCRUM-219\n\nCon `NODE_ENV=development` se saltea el chequeo, y si la variable falta, `Bearer undefined` pasa la validación. Con la base de dev apuntando a producción, cualquiera puede mandar emails a alumnos reales y restringir accesos por mora.\n\nCriterios de aceptación:\n- Helper `assertCron()` usado por los 5 crons, también en desarrollo; si falta `CRON_SECRET` responde 500.\n- `CRON_SECRET` cargado en Vercel Production y Preview (verificado).\n- `curl -H 'Authorization: Bearer undefined'` responde 401/500, no 200."
  },
  {
    "camp_id": "CAMP-007",
    "summary": "[Crítica] Director/Administrativo/Reclamos: el personal no ve ningún reclamo (el flujo de reclamos está roto)",
    "issuetype": "Bug",
    "priority": "Highest",
    "labels": [
      "qa-2026-10",
      "origen-qa2",
      "mod-reclamos",
      "defensa-tesis",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "10",
    "description": "Origen: QA2-013 · docs/qa-2026-10/backlog-consolidado.md (CAMP-007)\nTipo: Bug · Severidad: Crítica · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\nJira relacionado: SCRUM-254\n\nLas páginas de staff leen `complaints` con el JWT del usuario; la única policy es `select_own`, así que RLS devuelve 0 filas sin error. Afecta listado, detalle (404) y el contador del dashboard (siempre 0).\n\nCriterios de aceptación:\n- Director y administrativo ven todos los reclamos (incluidos el del seed y el de QA2) en listado y detalle, leídos por Drizzle después de `requireRole`.\n- El contador \"reclamos abiertos\" de ambos dashboards es correcto.\n- Si la consulta falla se muestra un error, no \"Sin reclamos\"."
  },
  {
    "camp_id": "CAMP-008",
    "summary": "[Alta] Director/Administrativo/Alumnos: el buscador no filtra al escribir y se opera sobre la fila equivocada",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "mod-alumnos",
      "incidente",
      "must"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: QA1-024, INCIDENTE-2026-10-13 (causa) · docs/qa-2026-10/backlog-consolidado.md (CAMP-008)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\n\nEl buscador es un form GET sin botón ni debounce: solo filtra con Enter y no normaliza acentos (\"nandu\" no encuentra \"Ñandú\"). El usuario cree que filtró y opera sobre otra fila: causa directa del incidente.\n\nCriterios de aceptación:\n- Componente `SearchInput` con debounce de 300 ms y botón visible; la URL refleja `?q=`.\n- Búsqueda insensible a mayúsculas y acentos por nombre, email y DNI.\n- Muestra \"N resultados para «q»\" o \"Sin resultados\". Mismo componente en Docentes y Usuarios."
  },
  {
    "camp_id": "CAMP-009",
    "summary": "[Media] Todos/Auth: \"Cerrar sesión\" cierra la sesión en todos los dispositivos",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "mod-auth",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "10",
    "description": "Origen: QA1-022 · docs/qa-2026-10/backlog-consolidado.md (CAMP-009)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\n\n`signOut()` sin `scope` usa `global` y revoca todos los refresh tokens: el personal que usa la PC del instituto y el celular pierde ambas sesiones (y cortó sesiones compartidas durante el QA).\n\nCriterios de aceptación:\n- `signOut({ scope: 'local' })`; con dos navegadores, cerrar sesión en uno no afecta al otro.\n- Opcional: acción \"Cerrar sesión en todos los dispositivos\" en el perfil."
  },
  {
    "camp_id": "CAMP-010",
    "summary": "[Alta] Gestión: relevar con la Directora las decisiones que bloquean historias (I-01..I-09, Q-01..Q-06)",
    "issuetype": "Task",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "regla-negocio",
      "bloqueado-cliente",
      "defensa-tesis",
      "must"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "10",
    "description": "Origen: BA §8, hallazgos.md §I, PO-005 · docs/qa-2026-10/backlog-consolidado.md (CAMP-010)\nTipo: Tarea · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\nJira relacionado: SCRUM-180, SCRUM-181, SCRUM-187, SCRUM-233\n\nHay 15 preguntas abiertas que bloquean al menos 12 ítems: quién toma asistencia (I-01), porcentajes de descuento/recargo (I-02), matrícula y cuota (I-03), lista de espera y recursado (I-04/05), reactivación por pago (I-06), contadora (I-07), reportes para administrativo (I-08), Marketing (I-09), tardanza y redondeo (Q-01), pesos de evaluaciones (Q-02), egreso (Q-03), umbral de alerta (Q-04), vencimiento distinto del 10 (Q-05) y borrado de material por el docente (Q-06).\n\nCriterios de aceptación:\n- Acta de la reunión con cada respuesta, guardada en `docs/` y enlazada desde cada ticket bloqueado.\n- Se quita el label `bloqueado-cliente` de los tickets resueltos."
  },
  {
    "camp_id": "CAMP-011",
    "summary": "[Media] Gestión: cerrar el Sprint 9 vencido, registrar la retrospectiva y actualizar las métricas",
    "issuetype": "Task",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "defensa-tesis",
      "must"
    ],
    "epic": "E7 · QA-2026-10 · Defensa y documentación",
    "epic_key": null,
    "sprint": "10",
    "description": "Origen: PO-016 · docs/qa-2026-10/backlog-consolidado.md (CAMP-011)\nTipo: Tarea · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 10\n\nEl Sprint 9 venció el 11/09 sin avance y sin story points. Hay que cerrarlo, documentar el impedimento y dejar las métricas al día: es la evidencia de Scrum que evalúa la materia.\n\nCriterios de aceptación:\n- Sprint 9 cerrado; sus 10 issues pasan al backlog de las épicas correspondientes.\n- Retrospectiva del Sprint 9 en `docs/`, con el impedimento y la decisión tomada.\n- `docs/metricas-sprints.md` incluye el Sprint 9 y, al cierre, los sprints de la campaña."
  },
  {
    "camp_id": "CAMP-012",
    "summary": "[Alta] Todos/Datos: cualquier usuario autenticado puede leer pagos, DNI, notas y asistencia de todos (RLS USING true)",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa2",
      "seguridad",
      "privacidad",
      "mod-infra",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-003, QA2-009 (lectura de enrollment_id), BA-025 (parte) · docs/qa-2026-10/backlog-consolidado.md (CAMP-012)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 11\nJira relacionado: SCRUM-250\n\nLas policies de lectura son `USING (true)`: con la publishable key y su JWT, un alumno lee datos personales y contables de todos y puede desanonimizar las encuestas docentes.\n\nCriterios de aceptación:\n- Las lecturas sensibles pasan al servidor (Drizzle después de autorizar) y las policies de SELECT quedan en \"propias\" o se revocan (opción A de DEV-003).\n- Con el JWT de un alumno, `from('payments').select()` devuelve solo sus pagos.\n- No se agregan policies de staff que reabran la exposición."
  },
  {
    "camp_id": "CAMP-013",
    "summary": "[Alta] Administrativo: el acceso a secciones de dirección depende de user_metadata y las páginas no revalidan el rol",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa1",
      "seguridad",
      "mod-auth",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-004, QA1-004, QA1-005 · docs/qa-2026-10/backlog-consolidado.md (CAMP-013)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S-M · Sprint propuesto: 11\nJira relacionado: SCRUM-253\n\n`proxy.ts` decide con `user_metadata.role` (editable por el usuario), `director/layout.tsx` acepta al administrativo y la lista negra está incompleta: el administrativo navega `/director`, `/risk`, `/documents`, `/reports`, `/payments`.\n\nCriterios de aceptación:\n- El proxy usa `app_metadata.role` o `profiles.role`.\n- Layout `director-only` para las secciones exclusivas; lista blanca explícita de pantallas compartidas (si las hay).\n- Un administrativo que entra por URL a cualquier `/director/*` no compartida va a su portal o a /403."
  },
  {
    "camp_id": "CAMP-014",
    "summary": "[Alta] Profesor: puede tomar, corregir o borrar asistencia y publicar o generar autoevaluaciones de cursos ajenos",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa2",
      "seguridad",
      "mod-asistencia",
      "mod-autoevaluaciones",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-011, DEV-015, QA2-004, QA2-005, BA-011 (propiedad) · docs/qa-2026-10/backlog-consolidado.md (CAMP-014)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 11\nJira relacionado: SCRUM-246\n\nLas actions de asistencia y autoevaluaciones solo hacen `requireRole`: un profesor opera sobre cualquier `courseId`, publicar envía emails a alumnos de otro curso y `/profesor/assessments/[id]` muestra preguntas y respuestas de cursos ajenos. Las notas (DEV-010) van en SCRUM-246 con el mismo helper.\n\nCriterios de aceptación:\n- Helper `assertTeacherOwnsCourse` (compartido con SCRUM-246) en `record/update/deleteAttendance*`, `generate/publish/archiveAssessmentProfesor*`.\n- `/profesor/assessments/[id]` de un curso ajeno devuelve 404.\n- Tests: un POST con un `courseId` ajeno devuelve \"No autorizado\"."
  },
  {
    "camp_id": "CAMP-015",
    "summary": "[Alta] Alumno/Evaluación docente: se puede votar en cursos ajenos, votar infinitas veces y bloquear la encuesta de otro",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa2",
      "seguridad",
      "mod-eval-docentes",
      "must"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-012, QA2-010 (encuesta) · docs/qa-2026-10/backlog-consolidado.md (CAMP-015)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 11\nJira relacionado: SCRUM-250\n\n`submitSurveyAction` toma `teacherId`/`courseId` del form sin verificar inscripción y, sin `enrollmentId`, no controla duplicados: un alumno puede inflar o hundir la calificación de cualquier docente. La encuesta ya enviada se reabre sin `?enrollment=`.\n\nCriterios de aceptación:\n- La action deriva la inscripción activa del alumno en el servidor; sin inscripción, rechaza.\n- Una sola encuesta por alumno y curso, controlada en el servidor (registro separado, ver SCRUM-250).\n- La página de una encuesta ya respondida no reabre el formulario."
  },
  {
    "camp_id": "CAMP-016",
    "summary": "[Alta] Director/Administrativo/Alumnos: borrar un alumno elimina en cascada sus pagos y deja su cuenta habilitada",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa1",
      "regla-negocio",
      "mod-alumnos",
      "mod-pagos",
      "incidente",
      "must"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-019, QA1-023, BA-005, INCIDENTE-2026-10-13 (preventivas 2 y 3) · docs/qa-2026-10/backlog-consolidado.md (CAMP-016)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 11\nJira relacionado: SCRUM-234\n\n`deleteStudent` hace DELETE y `payments.student_id` es `ON DELETE CASCADE`: se pierde historia contable (contra la decisión D-02), `profiles`/auth quedan huérfanos y la confirmación es genérica. Pasó en producción el 13/10.\n\nCriterios de aceptación:\n- Baja lógica (estado inactivo y acceso bloqueado); los pagos siguen en los reportes.\n- `payments.student_id` pasa a `ON DELETE RESTRICT`; el borrado físico queda solo para director y solo sin pagos ni inscripciones.\n- La confirmación nombra al alumno (nombre y DNI) e informa pagos e inscripciones afectados.\n- Después de la baja, el usuario aterriza en el listado con toast (resuelve SCRUM-234).\n- Test de regresión: dar de baja un alumno con pagos no elimina pagos."
  },
  {
    "camp_id": "CAMP-017",
    "summary": "[Alta] Director/Docentes/Alumnos: las listas cacheadas muestran datos viejos (informe docente 404, conteos que no coinciden)",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa1",
      "origen-qa2",
      "mod-eval-docentes",
      "mod-alumnos",
      "mod-ui",
      "must"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-039, QA2-015, QA1-002 · docs/qa-2026-10/backlog-consolidado.md (CAMP-017)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 11\n\n`unstable_cache` sin TTL y persistido en disco sirve ids viejos cuando los datos cambian por fuera de la app (seed, SQL): el informe del docente da 404 y \"0 encuestas\", y dashboard (9), Alumnos (17) y Usuarios (14) no coinciden. Además hay tags que nadie invalida.\n\nCriterios de aceptación:\n- `revalidate: 300` en las listas cacheadas e invalidación de los tags faltantes (DEV-039).\n- Endpoint de revalidación con secret, usado al final del seed.\n- Después del seed, el informe del Profesor E2E muestra 1 encuesta y los tres conteos coinciden o el texto aclara qué cuenta cada uno."
  },
  {
    "camp_id": "CAMP-018",
    "summary": "[Alta] Director/Reportes y Cierre de ciclo: los cálculos se cortan en 1000 filas y no coinciden con lo que se consolida",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-reportes",
      "mod-promociones",
      "mod-cierre-ciclo",
      "must"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-033 · docs/qa-2026-10/backlog-consolidado.md (CAMP-018)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 11\n\nPromociones, Cierre de ciclo, Reportes y el dashboard calculan con PostgREST, que corta en 1000 filas por defecto: con datos reales los números son incorrectos y difieren del cierre que se consolida.\n\nCriterios de aceptación:\n- Esas pantallas calculan con los services Drizzle (agregados en SQL), sin límite implícito.\n- Con más de 1000 registros de asistencia, el % de Promociones coincide con el del cierre de ciclo."
  },
  {
    "camp_id": "CAMP-019",
    "summary": "[Alta] Pagos/Automatizaciones: ningún proceso automático pasa las cuotas vencidas a \"Vencida\"",
    "issuetype": "Bug",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa2",
      "regla-negocio",
      "mod-pagos",
      "mod-automatizaciones",
      "must"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: DEV-025, BA-007 (a), QA2-014 (observación) · docs/qa-2026-10/backlog-consolidado.md (CAMP-019)\nTipo: Bug · Severidad: Alta · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 11\nJira relacionado: SCRUM-207, SCRUM-209, SCRUM-206\n\nLas alertas de mora, la restricción de acceso y el riesgo dependen de que alguien apriete \"Verificar mora\": el `status` de la DB queda viejo y cada pantalla lo compensa a su manera.\n\nCriterios de aceptación:\n- El cron diario pasa a `overdue` toda cuota `pending` con vencimiento anterior a hoy (hora AR) y después corre las alertas.\n- El botón \"Verificar mora\" ejecuta exactamente lo mismo, sin duplicar avisos.\n- Con un pago pending vencido, el cron (con secret) lo pasa a overdue y manda la alerta."
  },
  {
    "camp_id": "CAMP-020",
    "summary": "[Media] Director/Administrativo/Pagos: los contadores Pendientes/Vencidos/Pagados no suman el total y cada pantalla dice otra cosa",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "origen-qa2",
      "mod-pagos",
      "must"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "11",
    "description": "Origen: QA1-003, QA2-014 (estado) · docs/qa-2026-10/backlog-consolidado.md (CAMP-020)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 11\n\nHay tres criterios de \"vencido\" (lista por fecha, dashboard por status, Excel por status): un pending vencido cuenta dos veces y el dashboard lo muestra \"a vencer\".\n\nCriterios de aceptación:\n- Función única `effectiveStatus()` usada por tarjetas, lista, dashboards, panel del alumno y Excel.\n- Pendientes + Vencidos + Pagados + Anulados = total.\n- El mismo pago muestra el mismo estado en todas las pantallas."
  },
  {
    "camp_id": "CAMP-021",
    "summary": "[Media] Promociones: el redondeo permite promover con 79,5% de asistencia o 6,95 de promedio",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "regla-negocio",
      "mod-promociones",
      "must"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "11",
    "description": "Origen: DEV-034, BA-002 (redondeo) · docs/qa-2026-10/backlog-consolidado.md (CAMP-021)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 11\nJira relacionado: SCRUM-190\n\nSe redondea antes de comparar con el umbral. Por defecto no se redondea; si la Directora define otra regla (Q-01), se aplica esa.\n\nCriterios de aceptación:\n- Test unitario: 35/44 asistencias no es apto; notas [7, 6.9] no es apto.\n- La comparación usa el valor sin redondear y la misma constante que el resto de la app."
  },
  {
    "camp_id": "CAMP-022",
    "summary": "[Media] Todos: los errores de permisos o de base muestran la pantalla de error genérica y los formularios quedan colgados sin aviso",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-po",
      "origen-qa1",
      "mod-ui",
      "must"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "12",
    "description": "Origen: DEV-022, QA1-016 (feedback), PO-014 · docs/qa-2026-10/backlog-consolidado.md (CAMP-022)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S-M · Sprint propuesto: 12\n\n`requireRole` lanza y no hay ningún `error.tsx`; la UI del administrativo ofrece acciones que son solo de director (reenviar invitación, editar notas, borrar material). Ante una mutación que no responde no hay timeout ni mensaje.\n\nCriterios de aceptación:\n- `checkRole` que devuelve `{error}` en las actions con `ActionResult`; toast en lugar de pantalla de error.\n- `src/app/(dashboard)/error.tsx` con \"Reintentar\" y mensaje en español.\n- Timeout de 20 s en `useFormAction` con toast \"No pudimos guardar, reintentá\".\n- La UI del administrativo no muestra acciones que no puede ejecutar."
  },
  {
    "camp_id": "CAMP-023",
    "summary": "[Media] Pagos/Alertas: la alerta al alumno y la alerta de mora a Dirección comparten la marca y una anula a la otra",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "regla-negocio",
      "mod-pagos",
      "mod-notificaciones",
      "must"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "12",
    "description": "Origen: DEV-026, BA-007 (b) · docs/qa-2026-10/backlog-consolidado.md (CAMP-023)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S-M · Sprint propuesto: 12\nJira relacionado: SCRUM-207\n\nUna sola columna `overdue_alert_sent_at` para dos avisos distintos: si el cron le mandó el email al alumno, el aviso de 15 días a Dirección no sale nunca.\n\nCriterios de aceptación:\n- Cada aviso tiene su propia marca (columnas o tabla de envíos).\n- Un pago vencido hace 20 días genera las dos alertas, una vez cada una."
  },
  {
    "camp_id": "CAMP-024",
    "summary": "[Media] Pagos: las cuotas suspendidas (más de 30 días de mora) no se pueden cobrar y desaparecen de la deuda",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "regla-negocio",
      "mod-pagos",
      "must"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "12",
    "description": "Origen: DEV-029, BA-009 (parte 1) · docs/qa-2026-10/backlog-consolidado.md (CAMP-024)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 12\n\nUn pago `suspended` no admite \"Marcar como pagado\" y no suma en la deuda informada: el alumno que quiere regularizar no puede pagar.\n\nCriterios de aceptación:\n- Se puede cobrar un pago `suspended` y se emite el recibo.\n- La deuda informada (dashboard, alumno, reportes) incluye las cuotas suspendidas."
  },
  {
    "camp_id": "CAMP-025",
    "summary": "[Media] Director/Cursos: el cupo seleccionado no se ve (botón blanco sobre blanco)",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "mod-cursos",
      "mod-ui",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: QA1-001 · docs/qa-2026-10/backlog-consolidado.md (CAMP-025)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 12\nJira relacionado: SCRUM-236\n\n`CourseForm` usa `bg-brand-600`/`border-brand-400`, que no existen en el `@theme`: el cupo elegido (15 por defecto) se ve en blanco y el usuario no sabe qué cupo quedó. Pasa también en `update-password` y `GenerateAssessmentForm`.\n\nCriterios de aceptación:\n- El cupo seleccionado se ve resaltado en alta y edición.\n- No quedan clases `brand-400`/`brand-600` sin definir (o se agregan esos tokens)."
  },
  {
    "camp_id": "CAMP-026",
    "summary": "Administrativo/Pagos: generar las cuotas del mes en un solo paso",
    "issuetype": "Story",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-po",
      "mod-pagos",
      "defensa-tesis",
      "must"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "12",
    "description": "Origen: PO-006, BA-018 (MVP) · docs/qa-2026-10/backlog-consolidado.md (CAMP-026)\nTipo: Historia · Severidad: Alta · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 12\nJira relacionado: SCRUM-179, SCRUM-181\n\nComo administrativa quiero generar de una vez las cuotas del mes de todos los alumnos activos (o de un curso), para no cargarlas de a una. Es el MVP de BA-018: el monto se ingresa al generar; la cuota por curso y la matrícula quedan en SCRUM-179/181 (bloqueadas por I-03).\n\nCriterios de aceptación:\n- Botón \"Generar cuotas del mes\" por curso o para todos los activos, con vencimiento el día 10.\n- Es idempotente: no duplica cuotas del mismo alumno y mes (índice único de DEV-045).\n- Resumen al terminar: N cuotas generadas, M ya existentes."
  },
  {
    "camp_id": "CAMP-027",
    "summary": "[Media] Alumno: el panel muestra las cuotas vencidas como \"pendientes\", con fecha ISO y sin formato de moneda",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-qa2",
      "mod-pagos",
      "mod-ui",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: QA2-014 · docs/qa-2026-10/backlog-consolidado.md (CAMP-027)\nTipo: Bug · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 12\n\nLa tarjeta del panel imprime `dueDate` y `amount` crudos (\"Vence: 2026-10-10 · $15000.00\") y no distingue vencidas; tampoco enlaza a Pagos.\n\nCriterios de aceptación:\n- Mismo formato es-AR que /alumno/payments, badge \"Vencido\" según `effectiveStatus()` y link a Pagos."
  },
  {
    "camp_id": "CAMP-028",
    "summary": "Alumno: ver en el panel si voy a promocionar",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-promociones",
      "defensa-tesis",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: PO-013 · docs/qa-2026-10/backlog-consolidado.md (CAMP-028)\nTipo: Historia · Severidad: Media · MoSCoW: Must · Esfuerzo: S-M · Sprint propuesto: 12\nJira relacionado: SCRUM-188, SCRUM-190\n\nComo alumno quiero ver mi asistencia y mi promedio contra los mínimos y un estado claro, para no enterarme al cierre de ciclo de que no promociono. Hoy los colores usan umbrales fijos en el código y el panel no muestra autoevaluaciones ni material.\n\nCriterios de aceptación:\n- Tarjeta \"Tu cursada\": asistencia vs. mínimo, promedio vs. mínimo y estado (Vas bien / En riesgo / No cumplís), con las constantes de SCRUM-188/190.\n- Accesos a Autoevaluaciones y Material desde el panel."
  },
  {
    "camp_id": "CAMP-029",
    "summary": "Profesor: ver en el panel la clase de hoy y los alumnos a seguir",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-asistencia",
      "mod-riesgo",
      "defensa-tesis",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: PO-010 · docs/qa-2026-10/backlog-consolidado.md (CAMP-029)\nTipo: Historia · Severidad: Media · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 12\n\nComo docente quiero ver la clase de hoy y qué alumnos están bajo el umbral de asistencia o de nota, para intervenir a tiempo. Hoy el riesgo solo lo ve Dirección.\n\nCriterios de aceptación:\n- Tarjeta \"Hoy\" con el curso del día y el acceso a tomar lista.\n- Tarjeta \"Alumnos a seguir\" con los que están bajo el umbral de alerta (mismas constantes que la alerta).\n- En el detalle del curso, tabla por alumno con % de asistencia, promedio y estado."
  },
  {
    "camp_id": "CAMP-030",
    "summary": "Profesor/Asistencia: ir directo a tomar lista de la clase de hoy",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-asistencia",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: PO-011 · docs/qa-2026-10/backlog-consolidado.md (CAMP-030)\nTipo: Historia · Severidad: Baja · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 12\n\nComo docente quiero tomar lista en un toque, porque es mi tarea más frecuente. Hoy hay que pasar por un listado, elegir el curso y confirmar la fecha aunque tenga un solo curso.\n\nCriterios de aceptación:\n- Si hay clase hoy según `class_days`, el acceso directo abre `/profesor/attendance/new?courseId=…` con la fecha de hoy (hora AR).\n- Con un solo curso, queda preseleccionado."
  },
  {
    "camp_id": "CAMP-031",
    "summary": "Director: dashboard que muestre lo que hay que resolver hoy",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-ui",
      "defensa-tesis",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: PO-002 · docs/qa-2026-10/backlog-consolidado.md (CAMP-031)\nTipo: Historia · Severidad: Media · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 12\n\nComo Directora quiero ver al entrar el monto adeudado, los alumnos en riesgo, los cursos casi llenos o vacíos y si las automatizaciones corrieron, sin abrir cuatro pantallas. Es la primera pantalla de la demo.\n\nCriterios de aceptación:\n- Franja \"Requiere tu atención\": $ adeudado y morosos, alumnos en riesgo alto (link a /director/risk), cursos con ocupación ≥ 90% o ≤ 30%, última corrida de automatizaciones.\n- Los gráficos usan los umbrales del cliente (SCRUM-188/190) y los conteos coinciden con las listas."
  },
  {
    "camp_id": "CAMP-032",
    "summary": "Alumno: ver y descargar mis recibos y certificados",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "mod-pagos",
      "mod-promociones",
      "defensa-tesis",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: BA-016, E-03 (hallazgos.md) · docs/qa-2026-10/backlog-consolidado.md (CAMP-032)\nTipo: Historia · Severidad: Media · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 12\n\nComo alumno quiero descargar el recibo de cada cuota pagada y el certificado de cada nivel aprobado, sin ir a la secretaría.\n\nCriterios de aceptación:\n- \"Ver recibo\" en cada pago `paid` del alumno, imprimible o PDF.\n- \"Descargar certificado\" en cada inscripción `completed`.\n- Un recibo o certificado de otro alumno se rechaza; el administrativo abre recibos bajo su propio portal."
  },
  {
    "camp_id": "CAMP-033",
    "summary": "Marketing: definir con la Directora si se oculta el módulo y actuar en consecuencia",
    "issuetype": "Task",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-marketing",
      "bloqueado-cliente",
      "must"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "12",
    "description": "Origen: PO-005, I-09 · docs/qa-2026-10/backlog-consolidado.md (CAMP-033)\nTipo: Tarea · Severidad: Media · MoSCoW: Must · Esfuerzo: S · Sprint propuesto: 12\nBloqueado por: I-09\nJira relacionado: SCRUM-187, SCRUM-255\n\nLa Directora pidió sacar Marketing (SCRUM-187), pero sigue en el menú, con ABM incompleto (D-03/D-04) y bugs cargados (SCRUM-255). Propuesta del PO: ocultarlo con un feature flag sin borrar el código.\n\nCriterios de aceptación:\n- Decisión registrada (I-09).\n- Si se oculta: sale del menú y de la demo; SCRUM-255 pasa a Won't do; SCRUM-187 se cierra con esta implementación."
  },
  {
    "camp_id": "CAMP-034",
    "summary": "Defensa: datos de demo realistas en el entorno de test y guion de demo por rol",
    "issuetype": "Task",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "defensa-tesis",
      "must"
    ],
    "epic": "E7 · QA-2026-10 · Defensa y documentación",
    "epic_key": null,
    "sprint": "12",
    "description": "Origen: PO-015 · docs/qa-2026-10/backlog-consolidado.md (CAMP-034)\nTipo: Tarea · Severidad: Alta · MoSCoW: Must · Esfuerzo: M · Sprint propuesto: 12\n\nPara la defensa hace falta un instituto creíble (unos 60 alumnos, 6 cursos, 3 meses de asistencia, notas y pagos, con casos de mora, riesgo y promoción) sobre el proyecto separado de la tarea de DEV-005, y un guion de 10 minutos.\n\nCriterios de aceptación:\n- `pnpm seed:demo` sobre el proyecto de test, con nombres realistas y sin prefijo E2E.\n- Gráficos, riesgo y promociones muestran casos en la demo.\n- Guion de demo por rol en `docs/`, que recorre inscripción con cupo, toma de lista, alerta de riesgo, cobro y recibo, promoción y certificado, y autoevaluación IA."
  },
  {
    "camp_id": "CAMP-035",
    "summary": "Documentación: alinear CLAUDE.md, encuentros y presentación con el producto y las reglas vigentes",
    "issuetype": "Task",
    "priority": "High",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-po",
      "defensa-tesis",
      "must"
    ],
    "epic": "E7 · QA-2026-10 · Defensa y documentación",
    "epic_key": null,
    "sprint": "12",
    "description": "Origen: BA-030, BA-031, PO-017 · docs/qa-2026-10/backlog-consolidado.md (CAMP-035)\nTipo: Tarea · Severidad: Alta · MoSCoW: Must · Esfuerzo: S-M · Sprint propuesto: 12\n\n`CLAUDE.md` lista como pendientes tickets cerrados, dice \"material por curso\" y tiene los umbrales viejos; los encuentros y la presentación usan \"IICANA\" como nombre del producto y no incorporan los casos borde nuevos.\n\nCriterios de aceptación:\n- `CLAUDE.md` y `CONTEXT.md` reflejan 70% y 0–100 (o los marcan como pendientes de SCRUM-188/190), sin pendientes cerrados.\n- Encuentro 6 incorpora o justifica los casos CB10–CB24 de BA §5.3; la edad mínima figura como implementada.\n- \"Smart Learning\" es el producto e IICANA el cliente en la presentación y el Encuentro 1.\n- Memoria del proyecto y nota de `qa-backlog.md` corregidas (DEV-047)."
  },
  {
    "camp_id": "CAMP-036",
    "summary": "[Media] Alumno/Autoevaluaciones: las respuestas correctas viajan al navegador antes de responder",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa2",
      "seguridad",
      "mod-autoevaluaciones",
      "should"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-014, QA2-010 (respuestas) · docs/qa-2026-10/backlog-consolidado.md (CAMP-036)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: M · Sprint propuesto: 13\nJira relacionado: SCRUM-251\n\n`QuizPlayer` recibe `correct` y `explanation` como props: la respuesta está en el HTML/RSC antes de contestar.\n\nCriterios de aceptación:\n- La corrección se hace en el servidor; el cliente recibe la explicación solo después de responder cada pregunta o al enviar.\n- El payload inicial del quiz no contiene `correct` ni `explanation`."
  },
  {
    "camp_id": "CAMP-037",
    "summary": "[Media] Material y Perfil: los archivos subidos aceptan cualquier tipo declarado por el cliente y quedan huérfanos",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa1",
      "seguridad",
      "mod-material",
      "mod-usuarios",
      "should"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-040 (uploads), QA1-017 · docs/qa-2026-10/backlog-consolidado.md (CAMP-037)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: M · Sprint propuesto: 13\nJira relacionado: SCRUM-189\n\nEl `contentType` lo decide el navegador y solo se valida la extensión: un HTML renombrado se sirve desde el bucket público. El avatar viejo queda en el bucket y la URL fija hace que se vea el anterior. (El material por curso y el bucket privado van en SCRUM-189.)\n\nCriterios de aceptación:\n- Validación por magic bytes y `contentType` forzado desde una whitelist (avatar y documentos).\n- Al reemplazar el avatar se borra el anterior y la URL lleva cache-busting (`?v=`).\n- Un HTML renombrado `.pdf` o `.png` se rechaza."
  },
  {
    "camp_id": "CAMP-038",
    "summary": "[Media] Infra: la app no envía headers de seguridad (CSP, anti-clickjacking, nosniff, Referrer-Policy)",
    "issuetype": "Task",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "seguridad",
      "mod-infra",
      "should"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-007 · docs/qa-2026-10/backlog-consolidado.md (CAMP-038)\nTipo: Tarea · Severidad: Media · MoSCoW: Should · Esfuerzo: S · Sprint propuesto: 13\n\nNinguna respuesta lleva CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options ni Referrer-Policy.\n\nCriterios de aceptación:\n- `next.config.ts` define los headers; securityheaders.com da al menos A en producción.\n- La app sigue funcionando (Supabase, Resend, fuentes) con la CSP aplicada."
  },
  {
    "camp_id": "CAMP-039",
    "summary": "[Media] Pagos/Alertas: los fallos de envío de email se marcan como enviados y la UI informa éxito",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-notificaciones",
      "mod-automatizaciones",
      "should"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-027 · docs/qa-2026-10/backlog-consolidado.md (CAMP-039)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: S · Sprint propuesto: 13\nJira relacionado: SCRUM-218, SCRUM-219, SCRUM-220\n\nNo se revisa la respuesta de Resend: si el envío falla, la alerta queda marcada como enviada y no se reintenta.\n\nCriterios de aceptación:\n- Con `RESEND_API_KEY` inválida el cron reporta `failed > 0` y la marca de enviado queda en null.\n- El panel de automatizaciones muestra enviados y fallidos."
  },
  {
    "camp_id": "CAMP-040",
    "summary": "[Media] Mora: la restricción por 2 cuotas no cuenta las suspendidas, no se levanta al pagar y las acciones del alumno siguen funcionando",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa2",
      "regla-negocio",
      "mod-pagos",
      "bloqueado-cliente",
      "should"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-031, BA-008, QA2-014 (observación) · docs/qa-2026-10/backlog-consolidado.md (CAMP-040)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: S-M · Sprint propuesto: 13\nBloqueado por: I-06 (rehabilitación automática o por Dirección)\nJira relacionado: SCRUM-209\n\nLa suspensión pasa la primera cuota a `suspended` y el corte por \"2 cuotas vencidas\" casi nunca llega a 2; al pagar, el acceso no se rehabilita; un alumno restringido puede seguir ejecutando actions.\n\nCriterios de aceptación:\n- Una cuota `suspended` + una `overdue` restringen el acceso.\n- Las actions del portal alumno rechazan a un alumno restringido.\n- Al quedar con menos de 2 cuotas impagas, el acceso se rehabilita según la respuesta a I-06."
  },
  {
    "camp_id": "CAMP-041",
    "summary": "[Media] Riesgo de abandono: la intervención registrada se pierde en la corrida siguiente y la tendencia cuenta doble",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-riesgo",
      "should"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-038 · docs/qa-2026-10/backlog-consolidado.md (CAMP-041)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: M · Sprint propuesto: 13\nJira relacionado: SCRUM-214\n\nLa detección diaria pisa la intervención que registró Dirección y el cálculo de tendencia duplica registros.\n\nCriterios de aceptación:\n- Intervenir un alumno y correr la detección: la intervención sigue visible.\n- La tendencia se calcula una vez por período."
  },
  {
    "camp_id": "CAMP-042",
    "summary": "[Media] Asistencia: el doble envío dispara alertas e IA dos veces y el estado de cada alumno no se valida",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-asistencia",
      "should"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "13",
    "description": "Origen: DEV-037, SCRUM-258 (asistencia) · docs/qa-2026-10/backlog-consolidado.md (CAMP-042)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: M · Sprint propuesto: 13\nJira relacionado: SCRUM-232, SCRUM-240, SCRUM-258\n\nLa toma de lista no usa el schema Zod (`recordAttendanceSchema` está muerto): un valor manipulado de `status` termina en 500, y un doble submit manda alertas y genera autoevaluaciones dos veces. Las fechas futuras van en SCRUM-240.\n\nCriterios de aceptación:\n- La action valida con Zod (incluido el enum present/absent/late).\n- Un doble submit genera un solo email y una sola generación de IA."
  },
  {
    "camp_id": "CAMP-043",
    "summary": "Director/Asistencia: definir quién toma lista y advertir si la fecha no es día de clase",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-asistencia",
      "bloqueado-cliente",
      "should"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "13",
    "description": "Origen: BA-011, G-06/I-01 (hallazgos.md) · docs/qa-2026-10/backlog-consolidado.md (CAMP-043)\nTipo: Historia · Severidad: Media · MoSCoW: Should · Esfuerzo: S-M · Sprint propuesto: 13\nBloqueado por: I-01\n\nComo Directora quiero que la asistencia la tome quien yo defina, solo en su curso y en un día de clase real, para que el 70% se calcule sobre datos válidos.\n\nCriterios de aceptación:\n- Solo los roles definidos en I-01 toman lista; la decisión queda escrita en el Encuentro 4.\n- Si la fecha no coincide con `class_days`, se pide confirmar \"¿Es una clase de recuperación?\".\n- Borrar una sesión registra quién la borró."
  },
  {
    "camp_id": "CAMP-044",
    "summary": "Director/Cierre de ciclo: cerrar un ciclo lectivo concreto, con egreso bien definido y sin efectos dobles",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "regla-negocio",
      "mod-cierre-ciclo",
      "bloqueado-cliente",
      "should"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "13",
    "description": "Origen: BA-014, DEV-035, SCRUM-259 (egreso) · docs/qa-2026-10/backlog-consolidado.md (CAMP-044)\nTipo: Historia · Severidad: Media · MoSCoW: Should · Esfuerzo: M · Sprint propuesto: 13\nBloqueado por: Q-03\nJira relacionado: SCRUM-259\n\nComo Directora quiero cerrar un ciclo lectivo concreto y que \"Egresado\" signifique lo que significa en el instituto. Hoy el cierre evalúa todo el historial, no es transaccional ni idempotente, y una baja vieja impide egresar.\n\nCriterios de aceptación:\n- El cierre evalúa solo las inscripciones del ciclo elegido.\n- La regla de egreso es la que define Q-03 (propuesta: al completar Avanzado); una baja vieja no lo impide.\n- Ejecutarlo dos veces no repite promociones ni emails (transacción + idempotencia)."
  },
  {
    "camp_id": "CAMP-045",
    "summary": "[Media] Alertas: el aviso de asistencia baja y el riesgo usan umbrales distintos de la regla de promoción",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-riesgo",
      "mod-notificaciones",
      "bloqueado-cliente",
      "should"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "13",
    "description": "Origen: BA-019 · docs/qa-2026-10/backlog-consolidado.md (CAMP-045)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: S-M · Sprint propuesto: 13\nBloqueado por: Q-04\nJira relacionado: SCRUM-210, SCRUM-190\n\nLa alerta al docente usa 70% mientras la promoción usa 80% (y Reportes compara con 70%). El aviso tiene que llegar antes de perder el mínimo, y el riesgo no cuenta las cuotas suspendidas ni las notas del curso.\n\nCriterios de aceptación:\n- El umbral de alerta (Q-04; propuesta 80%) y el mínimo (70%) salen de constantes únicas.\n- Docente y Dirección reciben el aviso una sola vez; el email informa el mínimo vigente.\n- La detección de riesgo cuenta cuotas `overdue` y `suspended` y considera las notas del curso."
  },
  {
    "camp_id": "CAMP-046",
    "summary": "Reclamos: respuesta al alumno, aviso de cambio de estado y acceso desde el menú",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-po",
      "origen-qa2",
      "mod-reclamos",
      "should"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "13",
    "description": "Origen: QA2-013 (extras), BA-015, PO-012 (reclamo del docente), E-02 · docs/qa-2026-10/backlog-consolidado.md (CAMP-046)\nTipo: Historia · Severidad: Media · MoSCoW: Should · Esfuerzo: M · Sprint propuesto: 13\nJira relacionado: SCRUM-254, SCRUM-257\n\nComo alumno quiero encontrar \"Reclamos\" en mi menú y ver la respuesta del instituto, para no tener que preguntar en secretaría. Hoy no hay campo de respuesta, el cambio de estado no notifica y `createComplaintAsProfesorAction` sigue sin UI.\n\nCriterios de aceptación:\n- \"Reclamos\" figura en el menú del alumno.\n- El personal escribe una respuesta; el alumno la ve y recibe una notificación al cambiar el estado.\n- Se conecta o se elimina el reclamo del docente (según I-07/Q-06 y BA-015)."
  },
  {
    "camp_id": "CAMP-047",
    "summary": "[Media] Profesor/Asistencia: en el celular los nombres de los alumnos quedan cortados al tomar lista",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-qa2",
      "mod-asistencia",
      "mod-ui",
      "should"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "13",
    "description": "Origen: QA2-016 · docs/qa-2026-10/backlog-consolidado.md (CAMP-047)\nTipo: Bug · Severidad: Media · MoSCoW: Should · Esfuerzo: S · Sprint propuesto: 13\nJira relacionado: SCRUM-139\n\nA 390 px los botones Presente/Ausente/Tarde ocupan el ancho y el nombre se trunca (\"Alumn…\"): con nombres reales los alumnos son indistinguibles.\n\nCriterios de aceptación:\n- A 390 px el nombre ocupa su propia línea (botones debajo) o hace wrap, sin truncar."
  },
  {
    "camp_id": "CAMP-048",
    "summary": "Todos: vocabulario único y en español en menús, niveles, mensajes y controles",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "origen-qa1",
      "origen-qa2",
      "mod-ui",
      "should"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "13",
    "description": "Origen: BA-029, QA1-008, QA1-012, QA2-001, QA2-008, DEV-046 (LEVEL_LABELS) · docs/qa-2026-10/backlog-consolidado.md (CAMP-048)\nTipo: Historia · Severidad: Baja · MoSCoW: Should · Esfuerzo: S-M · Sprint propuesto: 13\n\nComo usuario quiero que el sistema use siempre las mismas palabras y en español. Hoy: nivel en inglés en el panel docente (\"intermediate\"), \"Upper-intermedio\", 12 mapas locales de niveles, \"Mensajes\" vs \"Mis notificaciones\", \"Choose File / No file chosen\".\n\nCriterios de aceptación:\n- Todos los niveles usan `LEVEL_LABELS` (se eliminan los mapas locales; `LEVEL_SHORT_LABELS` si hace falta).\n- La mensajería tiene un solo nombre en menú, título y campana en los 4 portales; \"Dashboard\" pasa a \"Inicio\".\n- Selector de archivo propio en español.\n- Ningún error técnico llega en inglés a la UI (el locale de Zod se resuelve en SCRUM-236)."
  },
  {
    "camp_id": "CAMP-049",
    "summary": "[Baja] Auth: los links de reset e invitación se arman con headers del request",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "seguridad",
      "mod-auth",
      "could"
    ],
    "epic": "E1 · QA-2026-10 · Seguridad y datos de producción",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-009 · docs/qa-2026-10/backlog-consolidado.md (CAMP-049)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\nEl origen de los links sale de `Origin`/`X-Forwarded-Host`: un request manipulado puede generar links hacia otro dominio.\n\nCriterios de aceptación:\n- Los links usan una URL base de configuración (`NEXT_PUBLIC_SITE_URL`), nunca headers del request."
  },
  {
    "camp_id": "CAMP-050",
    "summary": "[Media] Infra: la conexión a Postgres no valida el certificado TLS y migraciones y runtime usan la misma URL",
    "issuetype": "Task",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "seguridad",
      "mod-infra",
      "could"
    ],
    "epic": "E6 · QA-2026-10 · Rendimiento e infraestructura",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-008 · docs/qa-2026-10/backlog-consolidado.md (CAMP-050)\nTipo: Tarea · Severidad: Media · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\nJira relacionado: SCRUM-123\n\n`ssl: { rejectUnauthorized: false }` acepta cualquier certificado. Además conviene separar la URL de migraciones (:5432) de la de runtime (:6543) y verificar SCRUM-123 en Vercel.\n\nCriterios de aceptación:\n- TLS con la CA de Supabase (`verify-full`).\n- `DATABASE_URL_MIGRATIONS` (:5432) para drizzle-kit; runtime en :6543 en Production y Preview (`vercel env ls`)."
  },
  {
    "camp_id": "CAMP-051",
    "summary": "[Media] Infra: las funciones corren en EE.UU. Este y la base está en EE.UU. Oeste, lejos de Córdoba",
    "issuetype": "Task",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "mod-infra",
      "could"
    ],
    "epic": "E6 · QA-2026-10 · Rendimiento e infraestructura",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-006, BA-032 (latencia) · docs/qa-2026-10/backlog-consolidado.md (CAMP-051)\nTipo: Tarea · Severidad: Media · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\n`vercel.json` fija `iad1` y la base está en `us-west-2`: cada query cruza el continente y suma latencia para usuarios en Córdoba.\n\nCriterios de aceptación:\n- Región de funciones alineada con la base (o la base migrada a `sa-east-1` junto con las funciones en `gru1`).\n- Medición antes y después del tiempo de carga de Pagos y Notas."
  },
  {
    "camp_id": "CAMP-052",
    "summary": "[Media] Autoevaluaciones IA: la generación no tiene cuota ni timeout, no valida el JSON y bloquea la toma de asistencia",
    "issuetype": "Bug",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-autoevaluaciones",
      "could"
    ],
    "epic": "E6 · QA-2026-10 · Rendimiento e infraestructura",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-016 · docs/qa-2026-10/backlog-consolidado.md (CAMP-052)\nTipo: Bug · Severidad: Media · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\n\nLa llamada a la API de Claude no tiene timeout ni límite por curso, el JSON del modelo no se valida con Zod y la generación automática corre dentro de la toma de asistencia.\n\nCriterios de aceptación:\n- Timeout y cuota por curso/día; el JSON se valida con Zod y un error se informa en español.\n- La generación automática corre fuera del request de asistencia (en segundo plano)."
  },
  {
    "camp_id": "CAMP-053",
    "summary": "[Media] Rendimiento: medir y asegurar tiempos de respuesta con 5 usuarios concurrentes",
    "issuetype": "Task",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "mod-infra",
      "defensa-tesis",
      "could"
    ],
    "epic": "E6 · QA-2026-10 · Rendimiento e infraestructura",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: BA-032 · docs/qa-2026-10/backlog-consolidado.md (CAMP-053)\nTipo: Tarea · Severidad: Media · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\nRNF de operación en mostrador: Pagos, Notas y Reportes deben cargar en segundos con 3 administrativas y 2 docentes a la vez. Se mide antes y después de los fixes de infraestructura.\n\nCriterios de aceptación:\n- Medición documentada con 5 sesiones concurrentes: cada pantalla carga en menos de 3 s (umbral a validar con el cliente).\n- Resultado incorporado como evidencia del RNF en la documentación."
  },
  {
    "camp_id": "CAMP-054",
    "summary": "[Baja] Crons/Notificaciones: envíos duplicados y la opción \"Horas de anticipación\" no tiene efecto",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-qa1",
      "mod-notificaciones",
      "mod-automatizaciones",
      "could"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-041, QA1-010 · docs/qa-2026-10/backlog-consolidado.md (CAMP-054)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\nJira relacionado: SCRUM-221\n\nCorrer un cron dos veces el mismo día duplica la tanda; no hay throttling ni `maxDuration`. `timingHours` se guarda pero nadie lo lee, y hay tres textos distintos sobre cuándo sale el recordatorio.\n\nCriterios de aceptación:\n- Idempotencia por día y tipo de envío; throttling hacia Resend; `maxDuration` en los crons.\n- `timingHours` cambia el comportamiento o se elimina, y los textos dicen una sola cosa."
  },
  {
    "camp_id": "CAMP-055",
    "summary": "Administrativo/Pagos: reactivar al alumno que regulariza su deuda",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-pagos",
      "bloqueado-cliente",
      "could"
    ],
    "epic": "E3 · QA-2026-10 · Cobranza y automatizaciones confiables",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: BA-009 · docs/qa-2026-10/backlog-consolidado.md (CAMP-055)\nTipo: Historia · Severidad: Media · MoSCoW: Could · Esfuerzo: S-M · Sprint propuesto: Backlog\nBloqueado por: I-06\n\nComo administrativa quiero que, al cobrarle la deuda a un alumno suspendido, el sistema lo reactive (o le pida a Dirección que lo haga), para que no quede suspendido por olvido.\n\nCriterios de aceptación:\n- Al no quedar cuotas con más de 30 días de mora, el alumno pasa a `active` automáticamente o Dirección recibe \"X regularizó su deuda: ¿reactivar?\" (según I-06).\n- La reactivación registra quién y cuándo."
  },
  {
    "camp_id": "CAMP-056",
    "summary": "[Baja] Inscripciones: se puede inscribir a un alumno suspendido o en un curso cerrado",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-dev",
      "regla-negocio",
      "mod-inscripciones",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: DEV-021, BA-012 · docs/qa-2026-10/backlog-consolidado.md (CAMP-056)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\n`validateAndCreateEnrollment` no mira el estado del alumno ni del curso.\n\nCriterios de aceptación:\n- Alumno suspendido o restringido: \"El alumno tiene deuda pendiente: regularizá antes de inscribir\".\n- Alumno inactivo o egresado: se pide confirmar el reingreso.\n- Curso inactivo o completado: no aparece en el selector y el POST se rechaza."
  },
  {
    "camp_id": "CAMP-057",
    "summary": "Pagos: controlar en el servidor el vencimiento el día 10",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-pagos",
      "bloqueado-cliente",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: BA-017, SCRUM-240 (V3) · docs/qa-2026-10/backlog-consolidado.md (CAMP-057)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\nBloqueado por: Q-05\nJira relacionado: SCRUM-240\n\nComo Directora quiero que las cuotas venzan el día 10, para que la mora se calcule igual para todos. Hoy el 10 es solo un valor por defecto.\n\nCriterios de aceptación:\n- Un vencimiento distinto del 10 pide confirmación y motivo (o se rechaza, según Q-05).\n- La generación de cuotas (CAMP-026) usa el día 10."
  },
  {
    "camp_id": "CAMP-058",
    "summary": "Administrativo/Alertas: avisar a administración y al docente cuando un alumno falta 2 veces seguidas",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "origen-po",
      "regla-negocio",
      "mod-asistencia",
      "mod-notificaciones",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: BA-022, PO-009 (ausentes) · docs/qa-2026-10/backlog-consolidado.md (CAMP-058)\nTipo: Historia · Severidad: Media · MoSCoW: Could · Esfuerzo: S-M · Sprint propuesto: Backlog\n\nComo administrativa quiero recibir el aviso de 2 ausencias seguidas de un alumno, porque soy quien se comunica con la familia.\n\nCriterios de aceptación:\n- Al registrarse la segunda ausencia consecutiva, notifican Dirección, las administrativas y el docente del curso.\n- Si el alumno es menor, el aviso indica contactar al tutor."
  },
  {
    "camp_id": "CAMP-059",
    "summary": "[Baja] Validaciones y redirecciones menores en varios módulos",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-pagos",
      "mod-cursos",
      "mod-reclamos",
      "mod-marketing",
      "could"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-045 · docs/qa-2026-10/backlog-consolidado.md (CAMP-059)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\nJira relacionado: SCRUM-252, SCRUM-253\n\nConjunto de fixes S: `updateInquiryStatusAction` sin Zod; `createComplaintAction` sin `requireRole`; no se puede quitar aula/especialización (\"\" → null); `maxCapacity` menor que los inscriptos; dos cuotas del mismo alumno y vencimiento; `STATUS_LABELS` sin \"Anulado\" en el Excel; `getUser()` en una action; se re-notifica \"Nota publicada\" en cada edición. (Los `redirectTo` fijos van en SCRUM-253 y QuizPlayer en SCRUM-256.)\n\nCriterios de aceptación:\n- Cada punto de la lista de DEV-045 resuelto o descartado con motivo.\n- Índice único parcial `(student_id, due_date) WHERE status <> 'cancelled'`."
  },
  {
    "camp_id": "CAMP-060",
    "summary": "[Baja] Emails: caracteres cirílicos en los textos y HTML sin escapar",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "mod-notificaciones",
      "could"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: DEV-044 · docs/qa-2026-10/backlog-consolidado.md (CAMP-060)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\nHay letras cirílicas mezcladas en plantillas (se ven bien pero son otros caracteres) y los valores se interpolan en el HTML sin escapar.\n\nCriterios de aceptación:\n- `grep -P \"[\\x{0400}-\\x{04FF}]\" src` no devuelve nada.\n- Los valores interpolados en emails se escapan."
  },
  {
    "camp_id": "CAMP-061",
    "summary": "[Baja] Director/Cursos: hay cursos con cupo 20 y editarlos baja el cupo a 15 sin avisar",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "regla-negocio",
      "mod-cursos",
      "bloqueado-cliente",
      "could"
    ],
    "epic": "E4 · QA-2026-10 · Integridad de datos y formularios",
    "epic_key": null,
    "sprint": "Backlog",
    "description": "Origen: QA1-021 · docs/qa-2026-10/backlog-consolidado.md (CAMP-061)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\nBloqueado por: Decisión de la Directora sobre los cursos con cupo 20\n\nLa DB no tiene CHECK de cupo y `CourseForm` reemplaza cualquier valor mayor a 15 por 15 en silencio: guardar otro cambio reduce el cupo de un curso real (Adults 4).\n\nCriterios de aceptación:\n- Decidir con la Directora qué hacer con los cursos de 20.\n- El formulario nunca cambia el cupo sin mostrarlo; migración `CHECK (max_capacity BETWEEN 1 AND 15)` si se mantiene la regla."
  },
  {
    "camp_id": "CAMP-062",
    "summary": "Director: menú agrupado por secciones y con nombres que no se confundan",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-ui",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: PO-001 · docs/qa-2026-10/backlog-consolidado.md (CAMP-062)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\nComo Directora quiero un menú corto y agrupado. Hoy son 23 ítems planos, \"Comunicaciones\" y \"Notificaciones\" parecen lo mismo, Cursos y Material comparten ícono y \"Administrativos\" es un filtro de Usuarios.\n\nCriterios de aceptación:\n- Secciones Académico, Administración, Gestión y Configuración.\n- \"Notificaciones\" (configuración) pasa a \"Alertas automáticas\", con ícono propio; Material tiene un ícono distinto de Cursos."
  },
  {
    "camp_id": "CAMP-063",
    "summary": "[Baja] Textos: plurales y espacios mal armados en varias pantallas",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "origen-qa2",
      "mod-ui",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: QA1-006, QA1-007, QA2-003 · docs/qa-2026-10/backlog-consolidado.md (CAMP-063)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\n\"evaluaciónes\", \"comunicaciónes\", \"Últimas 1 clases registradas\" y \"Hay 3alumno(s) apto(s)\": el plural se arma agregando \"es\" y falta un espacio.\n\nCriterios de aceptación:\n- Helper `plural(n, singular, plural)` usado en notas, comunicaciones, asistencia y cierre de ciclo de los 3 portales.\n- Textos correctos para 0, 1 y N."
  },
  {
    "camp_id": "CAMP-064",
    "summary": "[Baja] Director/Reportes: porcentajes y fechas del Excel salen como texto y los formatos se mezclan",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "mod-reportes",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: QA1-011 · docs/qa-2026-10/backlog-consolidado.md (CAMP-064)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\n\"% Asistencia\" se exporta como texto, las fechas como string, la pantalla mezcla punto y coma decimal, la proyección se grafica con un solo mes y los archivos no llevan fecha.\n\nCriterios de aceptación:\n- Excel con valores numéricos y de fecha con formato; pantalla en es-AR; nombre de archivo con fecha.\n- La proyección se oculta o se explica con menos de 2 meses de datos."
  },
  {
    "camp_id": "CAMP-065",
    "summary": "[Baja] Auth: mensajes de requerido genéricos, 403 sin branding y link de invitación malformado con error crudo",
    "issuetype": "Bug",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "mod-auth",
      "mod-ui",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: QA1-018 · docs/qa-2026-10/backlog-consolidado.md (CAMP-065)\nTipo: Bug · Severidad: Baja · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\nLogin vacío dice \"Email inválido\"; /403 no tiene el branding y a un usuario sin sesión le dice \"No tenés permisos\"; `/invite/%%%` devuelve un 400 del framework.\n\nCriterios de aceptación:\n- Mensajes de requerido específicos; /403 con el mismo branding que la 404 y redirección al login sin sesión; link malformado con página \"Link inválido\"."
  },
  {
    "camp_id": "CAMP-066",
    "summary": "Administrativo: consultar cursos, horarios y vacantes antes de inscribir",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-cursos",
      "mod-inscripciones",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: PO-007 · docs/qa-2026-10/backlog-consolidado.md (CAMP-066)\nTipo: Historia · Severidad: Media · MoSCoW: Could · Esfuerzo: S · Sprint propuesto: Backlog\n\nComo administrativa quiero ver horario, docente y vacantes de cada curso, para responder \"¿hay lugar el martes a la tarde?\" sin probar inscribiendo. Hoy Cursos le da 403.\n\nCriterios de aceptación:\n- Vista de solo lectura `/administrativo/courses` con horario, docente, ocupación y (cuando exista) lista de espera."
  },
  {
    "camp_id": "CAMP-067",
    "summary": "Director/Administrativo: paginación y filtros en los listados",
    "issuetype": "Story",
    "priority": "Medium",
    "labels": [
      "qa-2026-10",
      "origen-dev",
      "origen-po",
      "mod-ui",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: PO-004, DEV-046 (sin paginación) · docs/qa-2026-10/backlog-consolidado.md (CAMP-067)\nTipo: Historia · Severidad: Media · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\n\nComo administrativa quiero listas paginadas y con filtros, porque con datos reales (cientos de alumnos y miles de cuotas) las listas se vuelven inusables. Ningún listado pagina y solo Alumnos tiene búsqueda.\n\nCriterios de aceptación:\n- Paginación del lado del servidor en Alumnos, Pagos, Inscripciones, Notas, Comunicaciones y Usuarios.\n- Filtros por estado y curso en Pagos, Inscripciones y Notas; búsqueda por alumno en Pagos."
  },
  {
    "camp_id": "CAMP-068",
    "summary": "Administrativo: dashboard con la agenda del día",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-ui",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: PO-009 · docs/qa-2026-10/backlog-consolidado.md (CAMP-068)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\n\nComo administrativa quiero que mi panel me diga qué hacer hoy, no los mismos KPIs que el director.\n\nCriterios de aceptación:\n- Bloques \"Cobros de hoy\", \"Vencen esta semana\", \"Morosos a contactar\" (con teléfono) y \"Ausentes de hoy\"."
  },
  {
    "camp_id": "CAMP-069",
    "summary": "Profesor: enviar un aviso a los alumnos de mi curso",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-po",
      "mod-notificaciones",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: PO-012 · docs/qa-2026-10/backlog-consolidado.md (CAMP-069)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: S-M · Sprint propuesto: Backlog\n\nComo docente quiero avisar a mi curso (\"mañana no hay clase\") desde el sistema y no por WhatsApp.\n\nCriterios de aceptación:\n- El profesor envía notificaciones solo a alumnos de sus cursos, validado con el helper de propiedad."
  },
  {
    "camp_id": "CAMP-070",
    "summary": "Director/Evaluación docente: corregir observaciones de clase y ver el cumplimiento del cuatrimestre",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "mod-eval-docentes",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: BA-026, D-05 (hallazgos.md) · docs/qa-2026-10/backlog-consolidado.md (CAMP-070)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: S-M · Sprint propuesto: Backlog\n\nComo Directora quiero corregir una observación mal cargada y ver qué docentes no tienen sus 2 observaciones del cuatrimestre.\n\nCriterios de aceptación:\n- Edición y baja de observaciones, con registro del cambio.\n- El listado de docentes muestra \"1/2\" o \"2/2\" observaciones del cuatrimestre."
  },
  {
    "camp_id": "CAMP-071",
    "summary": "Notas: promedio ponderado por tipo de evaluación",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-notas",
      "bloqueado-cliente",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: BA-023 · docs/qa-2026-10/backlog-consolidado.md (CAMP-071)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\nBloqueado por: Q-02\n\nComo Directora quiero que el final pese más que una tarea, para que el promedio refleje el criterio pedagógico.\n\nCriterios de aceptación:\n- Pesos configurables por Dirección y promedio ponderado; redistribución si falta un tipo.\n- Si el cliente mantiene el promedio simple, se corrige el Encuentro 2 §4.2."
  },
  {
    "camp_id": "CAMP-072",
    "summary": "Cursos: aulas y franja horaria del instituto",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-cursos",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: BA-024 · docs/qa-2026-10/backlog-consolidado.md (CAMP-072)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\n\nComo Directora quiero que el sistema no permita dos cursos en la misma aula a la misma hora ni fuera del horario del instituto.\n\nCriterios de aceptación:\n- Selector de aulas; rechazo de superposición indicando el curso en conflicto; validación de franjas 8–13 y 15–21."
  },
  {
    "camp_id": "CAMP-073",
    "summary": "Inscripciones: recursado con descuento y cambio de grupo",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "regla-negocio",
      "mod-inscripciones",
      "bloqueado-cliente",
      "could"
    ],
    "epic": "E2 · Ajustes de negocio: reglas del cliente",
    "epic_key": "SCRUM-191",
    "sprint": "Backlog",
    "description": "Origen: BA-021, C-02/C-03 (hallazgos.md) · docs/qa-2026-10/backlog-consolidado.md (CAMP-073)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\nBloqueado por: I-05\n\nComo administrativa quiero registrar el recursado (con su descuento) y el cambio de grupo sin perder la historia del alumno.\n\nCriterios de aceptación:\n- Inscripción como \"Recursante\" con el descuento definido.\n- En un cambio de grupo, la asistencia y las notas previas se conservan y cuentan."
  },
  {
    "camp_id": "CAMP-074",
    "summary": "Alumnos: historial académico unificado en la ficha",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-ba",
      "mod-alumnos",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: BA-028 · docs/qa-2026-10/backlog-consolidado.md (CAMP-074)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\n\nComo administrativa quiero ver en la ficha del alumno sus cursos, asistencia, notas, pagos y certificados, para atenderlo en el mostrador sin abrir cinco pantallas.\n\nCriterios de aceptación:\n- La ficha muestra por inscripción % de asistencia, promedio y estado de promoción, además de los pagos."
  },
  {
    "camp_id": "CAMP-075",
    "summary": "Todos: un patrón único de cabeceras, botones de formulario y acciones de fila",
    "issuetype": "Story",
    "priority": "Low",
    "labels": [
      "qa-2026-10",
      "origen-qa1",
      "mod-ui",
      "could"
    ],
    "epic": "E5 · UX y experiencia por rol",
    "epic_key": "SCRUM-194",
    "sprint": "Backlog",
    "description": "Origen: QA1-013 · docs/qa-2026-10/backlog-consolidado.md (CAMP-075)\nTipo: Historia · Severidad: Baja · MoSCoW: Could · Esfuerzo: M · Sprint propuesto: Backlog\n\nComo usuario quiero que todas las pantallas se comporten igual. Hoy el orden de botones se invierte entre formularios, el back link aparece solo en algunos, hay tablas con \"Ver →\" en lugar del ícono Eye y encabezados en dos estilos.\n\nCriterios de aceptación:\n- Guía corta de patrones en `docs/CONVENCIONES.md` (cabecera, botones de formulario, back link, acción de fila).\n- Los formularios y tablas listados en QA1-013 la cumplen."
  }
]
```
