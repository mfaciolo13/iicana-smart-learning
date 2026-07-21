# Encuentro 7 — Entregables del sistema

**Pregunta eje:** ¿El sistema produce algo que el cliente puede llevarse?

Cubre: especificación de cada reporte (quién lo pide, para qué decisión, con qué datos),
trazabilidad reporte → requerimiento, estado honesto del backlog y plan de entrega a
Práctica III.

---

## 1. Las salidas del sistema

El sistema transforma datos en información útil. Seis salidas concretas:

| Salida | Formato | Quién la genera |
|---|---|---|
| Reporte de asistencia | Excel (.xlsx) | Dirección |
| Reporte de notas | Excel (.xlsx) | Dirección |
| Reporte de pagos | Excel (.xlsx) | Dirección |
| Certificado de promoción | Imprimible (web → PDF) | Dirección / Alumno |
| Recibo de pago | Imprimible (web → PDF) | Alumno |
| Reporte diario | Email automático | Dirección (cron 10:00 UTC) |

---

## 2. Ficha de cada reporte

### 2.1 Reporte de asistencia

- **Quién lo pide:** la Directora.
- **Para qué decisión:** determinar quién cumple el mínimo de asistencia para promover y
  detectar cursos con ausentismo alto.
- **Con qué datos:** Alumno, DNI, Curso, Total de clases, Presentes, Ausentes, Tardanzas,
  % de asistencia.
- **Transforma, no solo lista:** el % de asistencia es **calculado** `(presentes + tardes)
  / total`, no un dato almacenado.
- **Ruta:** `GET /api/reports/attendance` → `reporte-asistencia.xlsx`. Solo rol `director`.

### 2.2 Reporte de notas

- **Quién lo pide:** la Directora.
- **Para qué decisión:** ver el rendimiento por alumno y curso, insumo de la promoción y
  de la evaluación docente.
- **Con qué datos:** Alumno, DNI, Curso, Tipo de evaluación, Nota, Fecha, Aprobado.
- **Ruta:** `GET /api/reports/grades` → `reporte-notas.xlsx`. Solo rol `director`.

### 2.3 Reporte de pagos

- **Quién lo pide:** la Directora (y la contadora externa a través de ella).
- **Para qué decisión:** controlar la recaudación, la morosidad y conciliar con la
  contadora.
- **Con qué datos:** Alumno, DNI, Monto, Vencimiento, Fecha de pago, Método, Estado, Nº de
  recibo.
- **Ruta:** `GET /api/reports/payments` → `reporte-pagos.xlsx`. Solo rol `director`.

> ⚠️ **Decisión abierta (I-08):** los tres reportes son **solo `director`**. La contadora
> y las administrativas no acceden. Hay que decidir: o se habilita el de pagos al rol
> `administrativo`, o se justifica la exclusión desde el negocio. El relevamiento pide
> además diferenciar totales diarios por método de pago (`SCRUM-185`) — pendiente.

### 2.4 Certificado de promoción

- **Quién lo pide:** el alumno que promocionó; lo emite la Directora.
- **Para qué:** constancia oficial de que completó el nivel.
- **Datos:** solo se genera para inscripciones en estado `completed`.
- **Ruta:** `/director/promotions/[enrollmentId]/certificate` (imprimible).

### 2.5 Recibo de pago

- **Quién lo pide:** el alumno, como comprobante.
- **Para qué:** constancia del pago; reemplaza el recibo manuscrito del proceso anterior.
- **Datos:** solo para pagos en estado `paid`.
- **Ruta:** `/director/payments/[id]/receipt` (imprimible).

### 2.6 Reporte diario por email

- **Quién lo recibe:** la Directora, automáticamente.
- **Para qué decisión:** empezar el día sabiendo qué pasó ayer sin pedir nada.
- **Datos:** pagos del día por método, alumnos con asistencia baja, nuevos alumnos.
- **Cómo:** cron `daily-report` a las 10:00 UTC.

---

## 3. Trazabilidad: cada reporte responde a un requerimiento real

| Reporte | Requerimiento de origen |
|---|---|
| Asistencia | `[REL-2025]` Proceso 10 "reportes de cumplimiento por alumno" |
| Notas | `[REL-2025]` "dificultad para generar reportes de rendimiento por curso o docente" |
| Pagos | `[REL-2025]` Proceso 4 "reporte de morosidad mensual"; RF-12 |
| Certificado | `[REL-2025]` Proceso 7 "emisión de certificado"; problema: "falta de automatización en la generación de certificados" |
| Recibo | `[REL-2025]` problema: "recibos manuales sin trazabilidad digital" |
| Reporte diario | `[REL-2025]` diagnóstico: "limitada disponibilidad de información en tiempo real para la dirección" |

`[REL-2025]` = relevamiento institucional Práctica I.

---

## 4. Estado honesto del backlog

Requisito del encuentro: *"SM presenta el estado del proyecto con honestidad sobre qué
queda para Práctica III."*

### 4.1 Hecho ✅

Sistema funcional en producción: auth, 4 portales, ABM completo de las entidades núcleo,
asistencia con corrección trazable, pagos con anulación auditada, 9 automatizaciones,
evaluación docente, autoevaluaciones IA, material por curso, promociones, cierre de ciclo,
certificados y recibos imprimibles, 3 reportes Excel, reporte diario automático.

### 4.2 Falta para cerrar bien la presentación 🔴

- Actualizar umbrales de negocio: 70% asistencia y escala 0–100 (`SCRUM-190`, `SCRUM-188`).
- Los 9 documentos de análisis FN (7 ya escritos: encuentros 1–7).
- Evidencia de gestión: actas de daily, retrospectivas, métricas por sprint.

### 4.3 Entra a Práctica III 📦

| Tema | Issue |
|---|---|
| Rediseño de pagos: matrícula, cuota por curso, descuentos, pago online, adelanto | `SCRUM-178` y sus hijas |
| Facturación electrónica ARCA | `SCRUM-184` |
| Lista de espera por cupo lleno | `SCRUM-233` |
| Chatbot de práctica de inglés "SmartEnglish" (RF-17) | — |
| Portal de tutores (RF-14) | — |
| CI/CD con GitHub Actions | `SCRUM-150` |
| Acceso propio de la contadora externa | — |
| Recursar con descuento; cambio de grupo en el cuatrimestre | C-02, C-03 |

---

## 5. Plan de entrega a Práctica III

1. **Congelar el alcance de Práctica II:** cerrar los pendientes 🔴 y etiquetar en Jira
   todo lo que pasa a la siguiente materia como `practica-iii`.
2. **Priorizar por valor de negocio:** el rediseño de pagos (`SCRUM-178`) es el más pedido
   por la Directora y el de mayor impacto en la recaudación; encabeza el backlog de III.
3. **Habilitar CI/CD** (`SCRUM-150`) al inicio de III: con el sistema ya en producción,
   automatizar typecheck, lint y E2E baja el riesgo de regresiones.
4. **Cerrar las decisiones abiertas con el cliente** (sección I de `hallazgos.md`) antes de
   estimar: porcentajes de descuento, monto de matrícula, quién toma asistencia.

---

## 6. Todo lo anterior sigue funcionando en conjunto

⬜ **Smoke test integral pendiente** (hallazgo A-05): recorrer los 4 portales de punta a
punta antes de la presentación —inscribir, tomar asistencia, cargar nota, cobrar, promover,
generar cada reporte— para demostrar que los módulos funcionan integrados, no solo por
separado. `pnpm tsc --noEmit` y los 159 tests unitarios ya pasan en verde.
