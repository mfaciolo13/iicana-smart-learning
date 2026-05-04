# Smart Learning — Contexto del Proyecto

## ¿Qué es este proyecto?

Sistema de gestión académica e institucional para institutos de enseñanza de inglés en Córdoba, Argentina. Es el trabajo de tesis de la carrera Analista de Sistemas de Computación (Institución Cervantes).

## Integrantes

- Amaya Amilcar
- Ferreyra Nicolas
- Ferreyra Amiel
- Faciolo Mayco

## Stack tecnológico

- **Next.js 16** (App Router, server-first) + TypeScript 5
- **Tailwind CSS 4**
- **Supabase** (Auth + Storage + PostgreSQL)
- **Drizzle ORM** sobre PostgreSQL de Supabase
- **Resend** para emails transaccionales
- **Lucide React** para iconos
- **Sonner** para toasts
- **Zod** para validación
- **pnpm** como package manager
- **Vercel** para deploy

## Roles del sistema

- `admin` → directora / personal administrativo
- `profesor` → docentes
- `alumno` → estudiantes
- `tutor` → padres/tutores de alumnos menores

## Módulos implementados

1. **Auth** — login, invite, update-password, logout
2. **Students** — CRUD alumnos con test de nivelación y tutor
3. **Teachers** — CRUD docentes
4. **Courses** — CRUD cursos con control de cupo (máx. 15)
5. **Enrollments** — inscripciones alumno-curso
6. **Attendance** — asistencia digital por clase
7. **Grades** — notas con promedios automáticos
8. **Payments** — cuotas mensuales con recibos
9. **Notifications** — mensajería interna
10. **Complaints** — sistema de reclamos/tickets
11. **Promotions** — promoción automática + certificados
12. **Assessments** — autoevaluaciones generadas por IA (Claude API)
13. **Teacher Evaluations** — encuestas anónimas + observaciones de clase
14. **Marketing** — campañas y seguimiento de consultas
15. **Year End** — cierre de ciclo lectivo
16. **Reports** — reportes Excel (asistencia, notas, pagos)
17. **Profile** — foto de avatar, nombre, teléfono por rol
18. **Users** — gestión de acceso (ban/unban, reenvío de invitación)

## Reglas de negocio clave

- Cupo máximo por curso: 15 alumnos
- Asistencia mínima para promoción: 80%
- Nota mínima para promoción: 7/10
- Vencimiento de pagos: día 10 de cada mes
- Alerta de mora: 15 días sin pago
- Suspensión: 30 días sin pago

## Repositorio y deploy

- Repositorio: GitHub (privado)
- Deploy automático en Vercel al pushear a `main`
- Dominio: `cervantes-smart-learning.com.ar`
- Email de envío: `no-reply@cervantes-smart-learning.com.ar` (via Resend)

## Metodología

Scrum con sprints de 2 semanas. Gestión en Jira (proyecto: SCRUM).
