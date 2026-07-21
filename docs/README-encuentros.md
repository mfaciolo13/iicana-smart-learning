# Documentos de los 7 Encuentros — Práctica Profesionalizante II

Un documento por encuentro, fundados en el código real, el board de Jira, el relevamiento
institucional de Práctica I (oct/2025) y el relevamiento con la Directora (may/2026).

| # | Encuentro | Pregunta eje | Documento |
|---|---|---|---|
| 1 | Informativo | ¿Cómo vamos a trabajar? | [encuentro-1-informativo.md](encuentro-1-informativo.md) |
| 2 | Validación de dominio | ¿De qué trata esto y tiene sentido el modelo? | [encuentro-2-dominio.md](encuentro-2-dominio.md) |
| 3 | Datos base | ¿Puedo cargar los datos base? | [encuentro-3-datos-base.md](encuentro-3-datos-base.md) |
| 4 | Identidad del sistema | ¿Puedo entrar y el sistema sabe quién soy? | [encuentro-4-identidad.md](encuentro-4-identidad.md) |
| 5 | Lógica de negocio | ¿El sistema hace lo que dice que hace? | [encuentro-5-logica-negocio.md](encuentro-5-logica-negocio.md) |
| 6 | Casos borde | ¿Qué pasa cuando algo sale mal? | [encuentro-6-casos-borde.md](encuentro-6-casos-borde.md) |
| 7 | Entregables | ¿El sistema produce algo que el cliente puede llevarse? | [encuentro-7-entregables.md](encuentro-7-entregables.md) |

**Documentos de apoyo:**

- [plan-encuentros.md](plan-encuentros.md) — mapeo sprint↔encuentro y plan de trabajo.
- [hallazgos.md](hallazgos.md) — backlog de 44 tareas con prioridad, evidencia y acción.

---

## Los diagramas

Todos los diagramas están en **Mermaid**, que GitHub renderiza automáticamente. Si tenés
que exportarlos a imagen para una presentación, pegá el bloque en
[mermaid.live](https://mermaid.live).

- Casos de uso → E3 §2.1
- Diagrama de actores → E4 §1
- BPMN proceso central y cobranza → E5 §2
- Story Map → E2 §5.4
- 5 diagramas de estado → E6 §1

---

## Lo que falta y solo puede aportar el equipo

Los documentos cubren toda la columna de análisis (FN) y la técnica (DEV). Lo que **no**
sale del repositorio y tienen que producir ustedes:

| Pendiente | De quién | Para qué encuentro |
|---|---|---|
| Actas de daily meetings | SM | 3, 4, 5, 6 |
| Retrospectivas con decisiones concretas | SM | 3, 6 |
| Métricas por sprint (comprometido vs. completado) | SM | 3, 4, 5, 6 |
| Respuestas del cliente a las 9 preguntas abiertas | equipo + cliente | varios (ver hallazgos.md §I) |
| Actualizar umbrales 70% / 0–100 en código | Dev | antes del 5 |
| Smoke test integral de los 4 portales | Dev | 7 |

La pregunta más urgente al cliente: **¿quién toma asistencia, el docente o la
administrativa?** — hoy el propio relevamiento se contradice (hallazgo G-06).
