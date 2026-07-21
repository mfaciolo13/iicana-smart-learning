# Encuentro 2 — Validación de dominio

**Pregunta eje:** ¿De qué trata esto y tiene sentido el modelo?

Documento de análisis funcional (FN). Sostiene los tres requisitos del encuentro:
procesos del negocio, actores identificados y justificación de cada entidad del DER
desde el negocio real.

> **Fuentes de este documento.** Todo lo que sigue está fundado en (a) el relevamiento
> con la Directora registrado en `SCRUM-191` y sus 12 historias hijas, (b) `SCRUM-170`
> (creación del rol administrativo) y (c) el modelo de datos implementado
> (`src/lib/drizzle/schema.ts`). Las secciones marcadas con **⚠️ A COMPLETAR** son las
> que requieren dato del equipo o de una nueva reunión con el cliente: no se
> completaron por inferencia para no presentar como relevado algo que no lo fue.

---

## 1. El negocio

**Institución Cervantes (IICANA)** — instituto de enseñanza de inglés en Córdoba,
Argentina. Dicta cursos por nivel a alumnos desde los 6 años, organizados en un ciclo
lectivo anual, con cuota mensual y matrícula de ingreso.

Datos del negocio confirmados en el relevamiento:

| Dato | Valor | Fuente |
|---|---|---|
| Edad mínima de ingreso | 6 años cumplidos | `SCRUM-186` |
| Cupo por curso | 15 alumnos | `courses.max_capacity` |
| Niveles dictados | 6 (principiante → avanzado) | enum `level` |
| Escala de calificación | Porcentaje 0–100% | `SCRUM-188` |
| Asistencia mínima para promover | 70% | `SCRUM-190` |
| Nota mínima para promover | 70% | `SCRUM-188` |
| Vencimiento de cuota | Día 10 de cada mes | `payments.due_date` |
| Período con descuento | Días 1 al 10 | `SCRUM-180` |
| Métodos de cobro | Efectivo, transferencia, débito, crédito | `SCRUM-180` |
| Obligación fiscal | Comprobante ARCA para todo pago no-efectivo | `SCRUM-184` |

### 1.1 El negocio sin sistema

**⚠️ A COMPLETAR — requiere dato del equipo.**

Esta sección debe describir cómo operaba el instituto **antes** de Smart Learning. Es
el requisito FN central del encuentro y no puede inferirse del código. Hay que
responder, con el detalle que se pueda:

- ¿En qué se llevaba el registro de alumnos y de inscripciones? (planilla, cuaderno,
  sistema anterior)
- ¿Cómo tomaba asistencia el docente y dónde quedaba asentada?
- ¿Cómo se registraban los cobros y cómo sabía la Directora cuánto se recaudó en el día?
- ¿Cómo se detectaba a un alumno moroso? ¿Quién lo contactaba y por qué vía?
- ¿Cómo se calculaba, al cierre del año, quién promocionaba?
- ¿Qué se hacía con las quejas o reclamos de alumnos?

Un indicio documentado que sirve de punto de partida: en `SCRUM-179` la Directora pide
que la cuota se configure por curso porque **"el precio es ingresado manualmente en cada
pago"**. Eso ubica el punto de partida del proceso de cobranza en la carga manual, sin
una fuente única del valor de la cuota.

### 1.2 Problema que resuelve el sistema

De los requerimientos relevados se desprenden cuatro dolores concretos:

1. **La Directora concentraba toda la operación.** `SCRUM-170` lo dice explícitamente:
   *"El director actualmente concentra todas las operaciones. Con el crecimiento de la
   institución, se necesita un perfil de secretaría."*
2. **Falta de visibilidad de la cobranza.** `SCRUM-185` pide totales diarios separados
   por método *"para tener claridad sobre cuánto ingresó en efectivo vs. depósitos
   bancarios."*
3. **Cumplimiento fiscal manual.** `SCRUM-184` exige que todo pago no-efectivo emita
   comprobante ARCA automáticamente.
4. **Seguimiento reactivo del alumno.** El instituto se enteraba tarde de la
   inasistencia y la morosidad; de ahí las automatizaciones de alerta.

---

## 2. Actores del negocio

Un actor del negocio es un rol **que existe en el instituto independientemente del
sistema**. Cada rol del sistema deriva de uno de ellos, no al revés.

| Actor del negocio | Qué hace en el instituto | Rol en el sistema |
|---|---|---|
| **Directora** | Dirige la institución. Define precios, cursos y criterios pedagógicos. Contrata docentes. Decide promociones y cierre de ciclo. Responde por la obligación fiscal. | `director` |
| **Secretaría / Administración** | Atiende el mostrador. Inscribe alumnos, cobra cuotas, emite recibos, carga asistencia, recibe reclamos. **No** define precios ni contrata. | `administrativo` |
| **Docente** | Dicta el curso, toma lista, evalúa y califica, comparte material de estudio. | `profesor` |
| **Alumno** | Cursa, asiste, rinde, paga la cuota, consulta sus notas y reclama. | `alumno` |
| **Aspirante / Interesado** | Consulta por cursos sin estar inscripto todavía. | — sin portal (ver 5.3) |
| **Padre / Tutor** | Paga la cuota del alumno menor y recibe la información. | — sin portal (ver 5.3) |
| **ARCA (ex AFIP)** | Actor externo. Recibe la declaración de cada pago no-efectivo y devuelve el CAE. | — sistema externo (`SCRUM-184`) |

### 2.1 Por qué el rol `administrativo` existe

Es el mejor ejemplo de trazabilidad negocio → sistema del proyecto, y conviene contarlo
así en el coloquio:

El diseño original tenía tres roles (director, profesor, alumno). El rol
`administrativo` **no salió de una decisión técnica sino de una necesidad del negocio
detectada en el relevamiento**: la secretaría necesitaba operar el día a día sin poder
tocar configuración estratégica. `SCRUM-170` define el corte exacto:

- **Puede:** alumnos, inscripciones, pagos, asistencia, reclamos, notificaciones, reportes.
- **No puede:** usuarios, docentes, cursos, evaluación docente, autoevaluaciones IA,
  cierre de ciclo, marketing.

El criterio de separación es de negocio, no técnico: **la secretaría ejecuta operaciones
del día; la Directora define las reglas del instituto.** Quien fija el precio de un
curso, contrata un docente o decide quién promociona es la Directora — y el sistema lo
refleja bloqueando esas secciones en `src/proxy.ts`.

---

## 3. Procesos del negocio

### 3.1 Proceso central — Ingreso y cursada del alumno

```
Consulta del aspirante
        │
        ▼
Inscripción ──────► valida: edad ≥ 6, cupo ≤ 15, sin duplicado, sin choque de horario
        │           cobra matrícula (SCRUM-181)
        ▼
Cursada ──────────► el docente toma asistencia clase a clase
        │           el docente carga notas por evaluación
        │           cuota mensual con vencimiento el día 10
        ▼
Cierre de ciclo ──► asistencia ≥ 70% Y nota ≥ 70% → promociona
        │           emite certificado de promoción
        ▼
Alumno promovido / graduado
```

### 3.2 Proceso de cobranza

```
Se genera la cuota (vence el día 10)
        │
        ├─ Días 1-10 ──► descuento según método (efectivo mayor, transf/débito menor)
        │                crédito: recargo, siempre
        │
        ├─ Pago ───────► efectivo  → recibo del sistema
        │                no-efectivo → recibo + comprobante ARCA obligatorio
        │
        └─ Impago ─────► vence → 'overdue'
                         +15 días → alerta a Dirección
                         +30 días → suspende alumno y pagos
                         2 cuotas vencidas → restringe acceso al portal
```

Las tres reglas de escalamiento están implementadas en
`src/modules/payments/services/payments.service.ts` y `src/modules/automations/actions.ts`.

### 3.3 Proceso de seguimiento académico

El sistema no espera a que alguien pregunte: cruza señales y avisa.

| Disparador | Acción automática | Dónde |
|---|---|---|
| 2 ausencias consecutivas | Notifica a Dirección | `attendance/actions.ts` |
| Alumno baja del 70% de asistencia | Alerta a docente y a Dirección (solo la 1ª vez) | `attendance.service.ts` |
| Mora + asistencia baja + bajo rendimiento | Calcula riesgo de abandono (none/low/medium/high) | `risk-detection.service.ts` |
| Cada N clases del curso | Genera autoevaluación diagnóstica con IA | `auto-assessment.service.ts` |

---

## 4. Justificación de cada entidad del DER

Cada entidad responde a la pregunta: **¿qué cosa del instituto representa, y qué se
rompería si no existiera?**

### 4.1 Entidades maestras

Describen cosas que existen de forma estable en el instituto.

| Entidad | Qué representa en el negocio | Por qué es necesaria |
|---|---|---|
| `profiles` | Una persona con acceso al sistema, con su rol | El instituto tiene cuatro tipos de personas con permisos distintos; sin esta entidad no hay forma de saber quién es quién ni qué puede ver |
| `students` | Un alumno del instituto | Guarda lo propio de la condición de alumno (DNI, fecha de nacimiento para validar la edad mínima de 6 años, nivel, estado) que no aplica a un docente |
| `teachers` | Un docente contratado | Guarda DNI y especialización; la Directora necesita saber qué docente puede dictar qué nivel |
| `courses` | Un curso que se dicta: nivel, horario, cupo, docente a cargo | Es la unidad de venta y de organización pedagógica del instituto. El cupo de 15 y la cuota mensual viven acá |

### 4.2 Entidades transaccionales

Registran hechos que ocurren en el tiempo. Son el corazón del sistema.

| Entidad | Qué representa en el negocio | Por qué es necesaria |
|---|---|---|
| `enrollments` | El hecho de que un alumno se inscribió a un curso | Es la relación que hace posible todo lo demás: sin inscripción no hay asistencia, ni notas, ni promoción. Es donde se aplican las reglas de cupo, duplicado y choque de horario |
| `attendance` | La presencia del alumno en una clase concreta | Insumo del umbral de promoción del 70% y de las alertas de deserción. Un registro por alumno y fecha |
| `grades` | La calificación de una evaluación | Insumo del otro umbral de promoción. Se distingue por tipo de evaluación (parcial, final, oral, tarea, quiz) porque no todas pesan igual pedagógicamente |
| `payments` | Una cuota o matrícula, su vencimiento y su cobro | Sostiene el ingreso del instituto y la obligación fiscal. De acá salen recibos, comprobantes ARCA y toda la cadena de mora |

### 4.3 Entidades de soporte

Cubren procesos reales del instituto que no forman parte del núcleo académico-financiero.

| Entidad | Qué representa | Origen en el negocio |
|---|---|---|
| `notifications` | Un aviso interno a un usuario | La comunicación institucional dejaba de estar en WhatsApp y pasaba a quedar registrada |
| `complaints` | Un reclamo formal del alumno | El instituto recibía quejas sin traza ni responsable; ahora tienen estado y resolución |
| `documents` | Material de estudio del curso | `SCRUM-189`: la Directora y los docentes piden compartir material para que el alumno lo consulte desde su portal |
| `assessments` / `assessment_attempts` | Autoevaluación diagnóstica y el intento del alumno | Permite al docente detectar temprano al alumno que no está siguiendo el curso |
| `teacher_surveys` | Evaluación anónima del docente por sus alumnos | Insumo de la Directora para la gestión pedagógica |
| `class_observations` | Observación de clase hecha por Dirección | La otra mitad de la evaluación docente: la mirada de la conducción |
| `marketing_campaigns` / `inquiries` | Campañas y consultas de aspirantes | ⚠️ **En baja** — ver 5.3 |

---

## 5. DER a presentar

### 5.1 DER núcleo (10 entidades)

La consigna pide 8–12 entidades. El modelo tiene 17 tablas; se presenta el núcleo del
negocio y el resto como anexo. Presentar las 17 sin jerarquizar se lee como falta de
criterio.

```
profiles ──1:1──┬── students ──1:N── enrollments ──1:N── attendance
                │        │                 │
                │        │                 └──1:N── grades
                │        │
                │        └──1:N── payments
                │
                └── teachers ──1:N── courses ──1:N── enrollments

profiles ──1:N── notifications
students ──1:N── complaints
```

**Entidad transaccional principal:** `enrollments` — es la que vincula las dos maestras
centrales (alumno y curso) y de la que cuelgan asistencia y notas.

### 5.2 Anexo (módulos complementarios)

`documents`, `assessments`, `assessment_attempts`, `teacher_surveys`,
`class_observations`, `student_risk_assessments`.

### 5.3 Decisiones de alcance a defender

Tres ausencias del modelo que el docente puede señalar. Conviene tener la respuesta
lista, porque las tres son decisiones, no olvidos:

**No existe entidad `tutor` ni portal para padres.** Se evaluó y se descartó. El
instituto se relaciona formalmente con el alumno; el tutor paga pero no es usuario del
sistema. Sumar un portal de tutores habría duplicado la gestión de permisos sobre datos
del alumno sin un proceso del negocio que lo pidiera.

**El aspirante no es un alumno.** Vive en `inquiries` justamente porque todavía no tiene
inscripción, ni cuota, ni asistencia. Convertirlo en `student` desde la consulta habría
contaminado los indicadores del instituto con gente que nunca se inscribió.

**Marketing está en baja por decisión del cliente.** `SCRUM-187` pide eliminar el módulo
completo. Si al momento del encuentro sigue en el sistema, presentarlo como *"módulo
construido que el cliente decidió dar de baja en el relevamiento de mayo"* — es un
ejemplo válido de gestión de alcance, no una carencia.

---

## 6. ⚠️ Divergencias entre lo relevado y lo implementado

**Esto es lo más importante del documento.** El Encuentro 5 pide *"FN: defiende cada
regla de negocio desde el cliente"*. Hoy hay cuatro reglas implementadas que
**contradicen lo que la Directora pidió** en el relevamiento de mayo:

| Regla | Implementado | Pedido por la Directora | Issue |
|---|---|---|---|
| Asistencia mínima para promover | **80%** | **70%** | `SCRUM-190` |
| Escala de calificación | **1 a 10** | **0 a 100%** | `SCRUM-188` |
| Nota mínima para promover | **7,0** (sobre 10) | **70** (sobre 100) | `SCRUM-188` |
| Métodos de pago | `cash, transfer, card` | `cash, transfer, debit, credit` (débito y crédito separados, con descuento y recargo distintos) | `SCRUM-180` |

Si en el coloquio preguntan *"¿por qué 80% de asistencia?"*, la respuesta honesta hoy es
*"porque fue el criterio inicial del equipo; la Directora después pidió 70% y está
pendiente de implementar"*. Eso es defendible **si está documentado como decisión
pendiente**; es indefendible si se presenta el 80% como si viniera del cliente.

**Recomendación:** implementar `SCRUM-190` y `SCRUM-188` antes del Encuentro 5. Son
cambios chicos (dos constantes, un schema de Zod y una migración de datos `score × 10`)
y eliminan la única contradicción real entre el análisis y el código.

---

## 7. Preguntas abiertas para la próxima reunión con el cliente

Datos que el relevamiento dejó pendientes y que hacen falta para cerrar el análisis:

1. **Porcentajes exactos** de descuento por efectivo, descuento por transferencia/débito
   y recargo por crédito (`SCRUM-180` los deja como configurables pero sin valores).
2. **Monto de matrícula** por curso y si varía según el nivel (`SCRUM-181`).
3. **Cómo se operaba antes del sistema** — insumo de la sección 1.1.
4. ¿El umbral del 70% de asistencia aplica **también** a la nota, o la nota mínima es otra?
5. ¿Qué pasa con el alumno suspendido por mora que después regulariza? ¿Vuelve
   automáticamente a `active` o requiere decisión de Dirección?
