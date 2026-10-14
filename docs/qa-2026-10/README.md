# Campaña QA y pulido — octubre 2026

Inicio: 13/10/2026. Objetivo: recorrer todos los flujos de la app como usuarios reales, documentar cada bug, mejora y feature faltante, y dejar el backlog listo para actualizar Jira (proyecto SCRUM).

## Equipo y entregables

| Rol | Alcance | Documento | Prefijo de ID |
|---|---|---|---|
| QA #1 | Portales director y administrativo, auth y flujos públicos | [qa1-director-administrativo.md](qa1-director-administrativo.md) | `QA1-NNN` |
| QA #2 | Portales profesor y alumno, flujos de punta a punta entre roles, aislamiento de datos | [qa2-profesor-alumno-e2e.md](qa2-profesor-alumno-e2e.md) | `QA2-NNN` |
| BA | Trazabilidad requisitos ↔ implementación, reglas de negocio, casos borde | [ba-trazabilidad-requisitos.md](ba-trazabilidad-requisitos.md) | `BA-NNN` |
| PO | Inventario de Jira, desfasajes Jira ↔ código, revisión de producto, priorización final | [po-jira-y-producto.md](po-jira-y-producto.md) | `PO-NNN` |
| Dev | Auditoría técnica (seguridad, correctitud, rendimiento, calidad), causa raíz de los bugs de QA | [dev-auditoria-tecnica.md](dev-auditoria-tecnica.md) | `DEV-NNN` |

Las capturas de evidencia están en [evidencias/](evidencias/).

## Resultado (13/10/2026)

- **[backlog-consolidado.md](backlog-consolidado.md):** 75 tickets nuevos (CAMP-001..075: 40 bugs, 24 historias, 11 tareas), 32 tickets SCRUM existentes reusados y las acciones sobre los existentes. Incluye el plan de sprints 10 a 13 y un JSON listo para cargar en Jira.
- **[INCIDENTE-2026-10-13.md](INCIDENTE-2026-10-13.md):** durante el QA se borró en producción una alumna real y un pago cobrado. La restauración está pendiente (CAMP-001).
- **Hallazgos de origen:** 24 de QA1, 16 de QA2, 32 de BA, 47 de DEV y 17 de PO.
- **Cobertura parcial:** las pruebas de escritura se suspendieron porque la base de dev/test es la de producción (DEV-005). Hay que retomarlas cuando exista un proyecto Supabase de test separado.

## Metodología

- La app se testea en `localhost:3000` (`pnpm dev`) con un Chromium real manejado por Playwright: navegación, formularios y screenshots, como un usuario. No se usa la suite E2E automatizada.
- Los datos son los del seed E2E (`pnpm seed:e2e`): usuarios `@e2e.test` y registros con prefijo `E2E`. Lo que crean los QA lleva el prefijo `E2E QA1` o `E2E QA2`, así lo limpia el seed.
- Se deduplica contra la campaña anterior ([../qa-backlog.md](../qa-backlog.md), SCRUM-234..259) y contra [../hallazgos.md](../hallazgos.md).

## Flujo

1. Fase 1: QA, BA, PO y Dev trabajan en paralelo.
2. Fase 2: Dev hace el análisis de causa raíz de los bugs de QA, y PO prioriza (MoSCoW + severidad) y deduplica contra Jira.
3. Se consolida todo en `backlog-consolidado.md`, que se carga en Jira una vez que se revisa.
