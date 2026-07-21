# Retrospectiva — Sprint 8

**Sprint:** 8 · **Fechas:** 11/06 – 25/06/2026 · **Facilita:** Mayco Faciolo (Scrum Master)

> Redactada como acta de retrospectiva. Registra lo que pasó de verdad, incluyendo el
> impedimento central del proyecto. La honestidad de esta acta es parte de lo que se
> evalúa: un buen SM documenta los problemas, no los esconde.

---

## 1. Resumen del sprint

- **Objetivo del sprint:** cerrar el sistema de alertas por email (configuración, cron y
  event-triggered) y las automatizaciones del sistema.
- **Comprometido:** 17 issues.
- **Completado:** 17 issues (**100%**).
- **Cierre:** el sprint se cerró **después** de su fecha de fin planificada (25/06). El
  motivo se analiza en el punto 3.

Issues destacados del sprint: detección automática de riesgo de abandono (`SCRUM-214`),
autoevaluación diagnóstica por IA (`SCRUM-213`), bloqueo por morosidad (`SCRUM-209`),
alertas de mora y ausencia, y los 5 crons diarios.

---

## 2. Qué salió bien 👍

- **Tasa de finalización del 100%.** Todo lo comprometido se completó.
- **Se entregó la parte más sofisticada del sistema:** la detección de riesgo de abandono,
  que cruza asistencia, pagos y rendimiento. Responde directamente al dolor que el
  relevamiento identificó ("alumnos que abandonan sin que la institución lo detecte a
  tiempo").
- **Las automatizaciones quedaron andando** de punta a punta, incluidos los cron jobs
  diarios en Vercel.

---

## 3. Qué no salió bien 👎

- **El equipo se redujo de 4 a 2 integrantes** durante el proyecto. Este es el impedimento
  central: con la mitad de la capacidad y el mismo alcance comprometido, la velocidad real
  cayó y el cierre del sprint se corrió más allá de la fecha planificada.
- **El sprint cerró tarde.** No por falta de trabajo terminado (se completó el 100%), sino
  porque el ritmo con medio equipo no alcanzó para cerrarlo dentro de la ventana de dos
  semanas.
- **Story points sin cargar.** El equipo no estimó en puntos, así que no hay velocity ni
  burndown por puntos para medir objetivamente el impacto de la reducción del equipo en la
  velocidad.
- **Carryover no visibilizado a tiempo.** En sprints previos (5 → 6) hubo issues arrastrados
  que no se marcaron como tal en la planificación.

---

## 4. Decisiones concretas tomadas 🎯

Una retrospectiva sin decisiones no sirve. Estas son las que se tomaron a raíz de lo
anterior:

| # | Decisión | Estado |
|---|---|---|
| D1 | **Recortar alcance** ante la reducción del equipo: el portal de tutores (RF-14) y el chatbot de práctica (RF-17) pasan a Práctica III. | Aplicada |
| D2 | **Sostener el stack elegido** (Next.js/TypeScript/Supabase/Vercel) por sobre el del anteproyecto (C#/.NET/SQL Server): con medio equipo, un stack unificado y sin servidor propio es la única opción viable en el tiempo restante. | Aplicada |
| D3 | **Priorizar automatizaciones** por sobre pantallas manuales: con menos gente, que el sistema decida solo entrega más valor que una vista más. | Aplicada |
| D4 | Reconocer el cierre tardío **sin falsear la fecha del sprint**: se documenta el impedimento en esta acta en lugar de maquillar el calendario. | Aplicada |
| D5 | **Cargar story points** de ahora en adelante (y retroactivamente si se decide) para poder medir velocidad. | Pendiente |
| D6 | Abrir el **Sprint 9** con fecha real y marcar explícitamente los issues arrastrados. | Pendiente |

---

## 5. Acciones para el próximo sprint (Sprint 9) 📋

- [ ] Abrir el Sprint 9 con fechas reales.
- [ ] Definir una escala de story points simple (2/3/5) y estimar el backlog del Sprint 9.
- [ ] Implementar los cambios de reglas que pidió la Directora: umbral de asistencia 70%
      (`SCRUM-190`) y escala de notas 0–100 (`SCRUM-188`).
- [ ] Cerrar `SCRUM-231` y `SCRUM-232` (resueltos en código, aún abiertos en el board).
- [ ] Marcar en el backlog todo lo que pasa a Práctica III con la etiqueta `practica-iii`.

---

## 6. Métrica de la retro (ánimo del equipo)

Con un equipo de 2 personas y un sistema entregado y funcionando en producción, el balance
es positivo: el alcance se ajustó a la capacidad real y **no se comprometió calidad**
(159 tests en verde, typecheck limpio). El aprendizaje central: **ajustar el compromiso a
la capacidad real del equipo apenas cambia, no al final del sprint.**
