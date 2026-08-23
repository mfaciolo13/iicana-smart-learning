# Sprint 9 — Plan

**Proyecto:** Smart Learning (SCRUM) · **Equipo:** 1 dev (Mayco)
**Origen del backlog:** campaña de QA E2E + auditoría paralela (27 tickets nuevos, SCRUM-234→260).

---

## 🎯 Objetivo del sprint (Sprint Goal)

> **Eliminar las pérdidas silenciosas de datos y hacer cumplir las reglas de negocio en el servidor:** que ninguna operación crítica falle sin aviso, guarde a medias, ni saltee las validaciones (cupo, elegibilidad, estados, permisos).

Es el hilo que une los hallazgos más graves de la auditoría. Al cerrarlo, la app deja de "mentir éxito" y las reglas de negocio dejan de vivir solo en la UI.

**Definition of Done (por ticket):**
- Fix aplicado + validación server-side donde corresponda.
- El `test.fail` de la suite E2E asociado (si existe) se destildea y **pasa en verde**.
- Probado manualmente el happy-path + el caso borde.

---

## ✅ Alcance comprometido (~23 pts)

### Épica 1 — Integridad de datos y formularios que fallan en silencio (9 pts)
Comparten el mismo patrón (desajuste cliente/servidor o campo mal ruteado). Arrancar por acá: son de alto impacto y bajo costo.

| Ticket | Item | Pts | Notas |
|---|---|---|---|
| **SCRUM-243** | placementTestScore nunca se guarda | 1 | Leer `formData` en las 2 actions |
| **SCRUM-235** | Nivel vacío bloquea el alta en silencio | 1 | `z.preprocess('' → undefined)` |
| **SCRUM-252** | No se puede desasignar docente de un curso | 1 | Mismo preprocess en `teacherId` |
| **SCRUM-242** | Editar nombre/teléfono no persiste | 3 | Agregar UPDATE a `profiles` en alumnos y docentes |
| **SCRUM-236** | No se puede crear un curso (crítico) | 3 | Registrar `SchedulePicker` en react-hook-form |

### Épica 2 — Reglas de negocio server-side (14 pts)
Reglas que hoy viven solo en la UI o no se chequean → integridad y seguridad.

| Ticket | Item | Pts | Notas |
|---|---|---|---|
| **SCRUM-249** | markAsPaid no valida estado (resucita anulados) | 1 | `where` con `inArray(status,[pending,overdue])` |
| **SCRUM-247** | Director puede auto-desactivarse/degradarse | 2 | Guard vs `getServerUser().id` + ≥1 director |
| **SCRUM-246** | IDOR: profesor carga notas de cursos ajenos | 3 | Verificar `teacher.profileId == course.teacherId` |
| **SCRUM-248** | Promoción sin revalidar 80%/nota 7 server-side | 3 | Reusar `getPromotionEligibility` + estado active |
| **SCRUM-244** | Reactivar inscripción saltea cupo/horario (+500) | 5 | Reusar `validateAndCreateEnrollment` + atrapar unique |

**Total comprometido: 23 pts.**

---

## ➕ Stretch (si sobra capacidad, ~5 pts)
| Ticket | Item | Pts |
|---|---|---|
| **SCRUM-245** | Reportes admin 403 (alinear guard) | 1 |
| **SCRUM-255** | Consulta de marketing sin dato de contacto | 1 |
| **SCRUM-251** | Autoevaluación: guard de intento duplicado (+índice único) | 3 |

---

## ⏭️ Fuera de alcance → Sprint 10
Agrupados por tema para el próximo sprint:
- **UX/feedback:** SCRUM-257 (toasts éxito), 254 (revalidar reclamo), 256 (feedback quiz), 234 (borrado→404).
- **Fechas:** SCRUM-240 (validaciones de fecha), 260 (off-by-one de display).
- **Navegación/obsoleto:** SCRUM-253 (portal cruzado admin), 241 (role:admin), 259 (código muerto), 237 (warning Field), 258 (validaciones menores).
- **Diseño/datos sensibles:** SCRUM-250 (anonimato de encuestas — requiere cambio de modelo, discutir antes).
- **Tooling/infra:** SCRUM-238 (fix durable Playwright), 239 (Supabase pause).
- **Backlog previo:** SCRUM-122 (badge notif), 123 (DATABASE_URL Vercel preview), 124 (avatar iniciales).

---

## 🔀 Orden de ataque sugerido
1. **Día 1-2 (quick wins):** 243 → 235 → 252 → 249 (4 tickets, 4 pts, todos ≤1h, mismo tipo de fix).
2. **Día 3-5:** 242 (persistencia perfil) → 236 (curso, desbloquea un flujo core).
3. **Día 6-8:** 247 → 246 (seguridad).
4. **Día 9-10:** 248 → 244 (los más grandes, reusar validaciones existentes).
5. Cierre: destildar los `test.fail`, correr `pnpm test:e2e` en verde, stretch si hay tiempo.

## ⚠️ Riesgos / notas
- **SCRUM-244** es el más pesado (transacción + lock + manejo de unicidad); si el sprint se aprieta, es el candidato a mover a Sprint 10.
- **SCRUM-251** implica una migración (índice único) → coordinar con el estado de la DB.
- Velocity aún sin calibrar (primer sprint post-QA): si 23 pts resulta ambicioso, **comprometé la Épica 1 completa + los quick-wins de la Épica 2 (249, 247)** y dejá 244/248 como stretch.

## Para crear en Jira (cuando se reconecte el MCP)
1. `jira_create_sprint` en el board de SCRUM (name: "Sprint 9", goal: el de arriba).
2. Mover los tickets comprometidos al sprint (`jira_update_sprint` / `add_issues_to_sprint`).
3. Cargar los story points (campo estimación) según esta tabla.
