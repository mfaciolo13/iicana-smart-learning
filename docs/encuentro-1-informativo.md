# Encuentro 1 — Informativo

**Pregunta eje:** ¿Cómo vamos a trabajar?

Documento de presentación del proyecto, el sistema base, las tecnologías (justificadas)
y el Sprint 0.

---

## 1. El proyecto

**IICANA Smart Learning** — Sistema Integral de Gestión Académica y Administrativa para
el Instituto Cultural Argentino Norteamericano, filial Pueyrredón (Córdoba).

Es la continuidad de Práctica Profesionalizante I: en octubre 2025 se hizo el
relevamiento institucional; en Práctica II se construye el sistema que ese relevamiento
propuso.

**El problema que resuelve:** la filial operaba con planillas físicas, Google Sheets,
WhatsApp y una sola notebook compartida. Eso generaba duplicación de datos, errores de
carga, imposibilidad de detectar a tiempo a un alumno en riesgo de abandono, y un cierre
de ciclo que llevaba más de una semana. (Detalle en
[encuentro-2-dominio.md](encuentro-2-dominio.md) §1.)

**El objetivo del sistema:** gestionar la información de las actividades operativas de
IICANA y la trazabilidad completa del ciclo académico de cada alumno, desde su
inscripción hasta su egreso.

---

## 2. El equipo

| Integrante | Rol Scrum |
|---|---|
| Mayco Faciolo | **Scrum Master** |
| Amilcar Amaya | Equipo de desarrollo |
| Ing. Fernando Loza (docente) | **Product Owner** |

> **Nota de gestión (para el SM).** El equipo arrancó Práctica I con 4 integrantes
> (Amaya, Faciolo, y los dos Ferreyra) y a lo largo del proyecto **se redujo a la mitad**.
> Este hecho es el impedimento central del proyecto y explica varias decisiones que se
> presentan más adelante: la elección del stack, el alcance recortado y el ritmo de los
> sprints. Un Scrum Master documenta y gestiona los impedimentos — no los esconde.

---

## 3. El sistema base

Estado actual (julio 2026): **sistema funcional desplegado en producción** en
`cervantes-smart-learning.com.ar`.

Implementado y andando:

- Autenticación completa (login, invitación por email, recuperación de contraseña).
- Portales diferenciados para los 4 roles (director, administrativo, profesor, alumno).
- ABM de alumnos, docentes, cursos, inscripciones, notas y pagos.
- Asistencia digital con corrección trazable.
- Sistema de pagos con recibos, mora escalonada y anulación auditada.
- 9 automatizaciones (promoción, mora, riesgo de abandono, alertas de ausencia,
  autoevaluación IA, 5 crons diarios).
- Evaluación docente (encuestas anónimas + observaciones de clase).
- Notificaciones internas + email.
- Autoevaluaciones generadas por IA.
- Material de estudio por curso.
- Promociones, cierre de ciclo y certificados imprimibles.
- Reportes Excel (asistencia, notas, pagos).

---

## 4. Tecnologías elegidas y justificadas

### 4.1 El stack

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router, server-first) | 16 |
| UI | React + TypeScript | 19 / 5 |
| Estilos | Tailwind CSS | 4 |
| Auth + Storage + BD | Supabase (`@supabase/ssr`) | — |
| ORM | Drizzle (sobre PostgreSQL) | 0.45 |
| IA | Claude API (`@anthropic-ai/sdk`) | — |
| Email | Resend | 6 |
| Validación | Zod | 4 |
| Hosting | Vercel | — |

### 4.2 La justificación — por qué NO es el stack del anteproyecto

El anteproyecto de Práctica I proponía **C# / .NET Framework + SQL Server + IIS**, un
servicio Python para la IA y WhatsApp Business API. El sistema **no** se construyó así,
y el motivo es de gestión antes que técnico: **el equipo pasó de 4 a 2 integrantes**.
Con la mitad de la gente y el mismo alcance comprometido, el stack del anteproyecto (tres
capas separadas + un servidor propio para administrar) no era sostenible en el tiempo
restante. Se eligió uno **más rápido de desarrollar y más confiable de operar.**

| Decisión | Anteproyecto | Elegido | Por qué, con medio equipo |
|---|---|---|---|
| Lenguaje | C# (backend) + JS (frontend) | **TypeScript en toda la pila** | Un solo lenguaje de punta a punta. No hay que mantener dos bases de código ni una API REST intermedia |
| Backend | .NET Framework + API REST | **Server Actions de Next.js** | Las mutaciones son funciones del servidor llamadas directo desde el formulario; menos capas, menos código |
| Base de datos | SQL Server | **PostgreSQL (Supabase)** | Trae Auth, Storage y seguridad a nivel de fila ya integrados; el anteproyecto los daba por construir a mano |
| Hosting | Servidor Windows + IIS | **Vercel** | Elimina la administración de servidor, backups y despliegue que el anteproyecto asumía como trabajo del equipo |
| IA | Python + modelo ML entrenado | **Claude API** | El modelo propuesto necesitaba un dataset histórico que el instituto no tiene, justamente porque no había sistema. Un modelo ya entrenado resuelve el requisito sin ese dato |
| Notificaciones | WhatsApp Business API | **Email (Resend)** | WhatsApp Business requiere aprobación de Meta y costo por mensaje. El email cumple el mismo requisito de trazabilidad sin dependencia externa ni costo |

**La conclusión honesta:** el cambio de stack no fue capricho técnico sino una respuesta
de gestión a la reducción del equipo. Es una decisión defendible y, contada así, es
evidencia de buen criterio de Scrum, no una desviación del plan.

---

## 5. Sprint 0

**Objetivo:** definir los parámetros iniciales del proyecto — arquitectura técnica,
modelo de datos, mockups de interfaz y el plan de sprints. (Duración: 2 semanas,
19/01–02/02/2026.)

**Backlog inicial y herramienta de gestión:** Jira (proyecto SCRUM, tablero Scrum). El
backlog se organizó en épicas por módulo de dominio, con historias de usuario y tareas.

**Estado de los sprints al día de hoy:**

| Sprint | Fechas | Estado |
|---|---|---|
| 0 | 19/01 – 02/02 | Cerrado |
| 1 a 7 | 02/02 – 11/06 | Cerrados |
| 8 | 11/06 – 25/06 | Cerrado |
| 9 | *a crear* | — |

> El proyecto va **adelantado** respecto de la hoja de ruta de los encuentros: la hoja
> asume Sprint 0→5, y el equipo lleva 0→8. El mapeo sprint↔encuentro está en
> [plan-encuentros.md](plan-encuentros.md).

---

## 6. Quién responde qué en el grupo

Según la consigna, en este encuentro cada integrante responde según su rol:

- **SM (Faciolo):** presenta el Sprint 0, el equipo, los roles, el backlog inicial y la
  herramienta; explica la reducción del equipo como impedimento gestionado.
- **Dev (Amaya):** presenta el sistema base y las tecnologías elegidas, con la
  justificación del cambio de stack.
- **PO (Loza):** valida el encuadre del proyecto y su continuidad hacia Práctica III.
