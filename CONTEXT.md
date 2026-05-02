# IICANA Smart Learning - Contexto del Proyecto

## ¿Qué es este proyecto?

Sistema de gestión académica e institucional para IICANA filial Pueyrredón, un instituto de enseñanza de inglés en Córdoba, Argentina. Es un trabajo práctico de la carrera Analista de Sistemas de Computación (Institución Cervantes).

## Integrantes

- Amaya Amilcar
- Ferreyra Nicolas
- Ferreyra Amiel
- Faciolo Mayco

## Stack tecnológico decidido

- **Next.js** (latest, App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (Auth + Storage + PostgreSQL)
- **Drizzle ORM** sobre el PostgreSQL de Supabase (para queries tipadas y migraciones versionadas)
- **React Hook Form** + **Zod** (para formularios de UI)
- **next-safe-action** (para Server Actions tipadas y seguras)
- **pnpm** como package manager

## Roles del sistema

- `admin` → directora / personal administrativo
- `profesor` → docentes
- `alumno` → estudiantes
- `tutor` → padres/tutores de alumnos menores

## Arquitectura decidida

- App Router de Next.js (server-first)
- Organización por dominios/features en `src/modules/`
- NO usar Redux, Zustand ni estado global por ahora
- NO backend separado, todo en Next.js
- NO Clean Architecture extrema, mantener simple y escalable
- Cada módulo tiene sus propios types, schemas, services y components
- `src/components/` solo para cosas verdaderamente compartidas
- `src/lib/` para configuración y utilidades compartidas

## Estructura de carpetas objetivo

```
src/
  app/
    (auth)/
      login/
      register/
    (dashboard)/
      admin/
      profesor/
      alumno/
      tutor/
    layout.tsx
    page.tsx
  components/
    ui/
    shared/
  lib/
    supabase/
      client.ts
      server.ts
    drizzle/
      index.ts
      schema.ts
      migrations/
    auth/
      helpers.ts
    utils/
  modules/
    auth/
      actions.ts
      schemas.ts
      types.ts
    users/
    students/
      actions.ts
      schemas.ts
      types.ts
      services/
        students.service.ts
      components/
        StudentList.tsx
        StudentForm.tsx
      page → app/(dashboard)/admin/students/
    teachers/
    courses/
    enrollments/
    attendance/
    grades/
    payments/
  types/
    index.ts
```

## Módulos y procesos del sistema (los 10 procesos clave de IICANA)

### Proceso 1: Inscripción y Matrícula

- Registro de alumnos con datos personales, DNI, tutor responsable
- Test de nivelación para determinar nivel
- Asignación a curso con control de cupo máximo (15 alumnos)
- Cobro de matrícula + primera cuota
- KPI: tiempo medio de inscripción ≤ 10 min

### Proceso 2: Asistencia Diaria

- Registro digital de asistencia por clase (presente/ausente/tarde)
- Cálculo automático del porcentaje de asistencia
- Alerta automática si alumno acumula 2 ausencias consecutivas
- Asistencia mínima requerida: 80%
- KPI: cobertura de registro ≥ 95%

### Proceso 3: Evaluación y Notas

- Carga de notas (escala 1-10) por parte del docente
- Cálculo automático de promedios
- Publicación de notas a alumnos/tutores
- Promedio mínimo para promoción: 7/10
- KPI: evaluaciones publicadas en plazo ≤ 72hs ≥ 90%

### Proceso 4: Pagos y Cobros

- Registro de pagos de cuotas mensuales
- Vencimiento el día 10 de cada mes
- Alertas automáticas a los 15 días de mora
- Suspensión temporal a los 30 días sin pago
- Recibos digitales
- KPI: morosidad mensual ≤ 8%

### Proceso 5: Comunicación Institucional

- Canal de mensajería interna centralizado
- Notificaciones automáticas (ausencias, pagos, notas, eventos)
- Segmentación por curso o individual
- KPI: tiempo de respuesta a consultas < 24hs

### Proceso 6: Evaluación Docente

- Encuestas anónimas a alumnos por cuatrimestre
- Observaciones de clase registradas por directora
- Informe de evaluación por docente
- KPI: 90% de docentes evaluados por cuatrimestre

### Proceso 7: Promoción de Alumnos

- Verificación automática: promedio ≥ 7 y asistencia ≥ 80%
- Decisión de promoción o recursada
- Emisión de certificados digitales
- Reubicación en curso siguiente
- KPI: tasa de promoción ≥ 80%

### Proceso 8: Reclamos y Consultas

- Sistema de tickets de reclamos
- Clasificación: académico / administrativo / infraestructura / docente
- Resolución máxima en 48hs
- KPI: tiempo medio de resolución ≤ 48hs

### Proceso 9: Publicidad y Marketing

- Registro de campañas y consultas recibidas
- Seguimiento de conversión (consulta → inscripción)
- KPI: tasa de inscripción por campaña ≥ 15%

### Proceso 10: Cierre de Ciclo Lectivo

- Consolidación de notas, asistencias y pagos
- Generación de reportes institucionales
- Emisión masiva de certificados
- Planificación del próximo periodo
- KPI: tiempo de cierre ≤ 5 días

## Schema de base de datos (Drizzle)

### Tablas principales a crear:

- `profiles` → extensión de auth.users (id, email, role, full_name, phone, created_at)
- `students` → alumnos (id, profile_id, dni, birth_date, tutor_id, level, status)
- `tutors` → tutores (id, profile_id, dni, relationship)
- `teachers` → docentes (id, profile_id, dni, specialization)
- `courses` → cursos (id, name, level, schedule, classroom, max_capacity, teacher_id, status)
- `enrollments` → inscripciones (id, student_id, course_id, enrolled_at, status)
- `attendance` → asistencia (id, enrollment_id, class_date, status: present/absent/late)
- `grades` → notas (id, enrollment_id, evaluation_type, score, evaluated_at, notes)
- `payments` → pagos (id, student_id, amount, due_date, paid_at, method, status, receipt_number)
- `notifications` → notificaciones (id, user_id, type, title, body, read, created_at)
- `complaints` → reclamos (id, user_id, type, description, status, resolved_at)

## Requerimientos funcionales principales

- RF-01: Gestión completa de alumnos con historial unificado
- RF-02: Gestión de cursos con control de cupos
- RF-03: Gestión de docentes y carga horaria
- RF-04: Registro digital de asistencia con alertas automáticas
- RF-05: Carga de notas con cálculo automático de promedios
- RF-06: Gestión de pagos con recibos digitales
- RF-07: Control automático de morosidad
- RF-08: Mensajería institucional centralizada
- RF-09: Notificaciones automáticas por eventos
- RF-10: Dashboard con KPIs en tiempo real
- RF-11: Reportes académicos exportables (Excel/PDF)
- RF-12: Reportes financieros
- RF-13: Historial completo por alumno
- RF-14: Gestión de usuarios y roles
- RF-15: Auditoría de operaciones críticas

## Requerimientos no funcionales

- Seguridad: HTTPS, contraseñas encriptadas, Ley 25.326 de Protección de Datos
- Disponibilidad: 24/7, uptime ≥ 99%, backup automático diario
- Compatibilidad: responsive, Chrome/Firefox/Safari/Edge, 320px-1920px
- Rendimiento: tiempo de respuesta < 2 segundos, soporte 100 usuarios simultáneos
- Escalabilidad: hasta 1000 alumnos y 50 docentes
- Auditabilidad: logs de operaciones críticas por 12 meses

## Regla obligatoria: diseño responsive

**TODO el código que se escriba debe ser responsive por defecto.** El sistema debe funcionar correctamente en 320px–1920px. Aplicar siempre:

- Grids: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` según contexto
- Tablas: `overflow-x-auto` siempre, columnas secundarias con `hidden sm:table-cell` o `hidden md:table-cell`
- Formularios: columna única en mobile, `sm:grid-cols-2` en desktop
- Sidebar: colapsable en mobile (overlay drawer), visible fija en `lg:` en adelante
- Topbar: visible en mobile con botón hamburguesa para abrir sidebar
- Espaciado y padding: menores en mobile (`p-4 sm:p-6`), mayores en desktop
- Tipografía: escalar con breakpoints cuando sea necesario
- No usar anchos fijos sin fallback responsive
- Probar mentalmente la vista en 375px (iPhone) antes de considerar una pantalla terminada

## Lo que hay que construir (en orden)

1. Inicializar proyecto con `pnpm create next-app`
2. Instalar todas las dependencias
3. Crear estructura de carpetas completa
4. Configurar Supabase client + server
5. Configurar Drizzle ORM con schema completo
6. Crear middleware de autenticación y protección de rutas por rol
7. Implementar flujo de autenticación (login/logout/sesión)
8. Crear layouts base para dashboard por rol
9. Páginas placeholder para /admin, /profesor, /alumno, /tutor
10. Módulo `students` completo como ejemplo (types + schema + service + actions + components + página)
11. Módulo `auth` completo
12. Variables de entorno necesarias (.env.local.example)
13. Instrucciones de setup de Supabase

## Variables de entorno necesarias

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

## Notas importantes

- El repositorio está en: C:\Users\mdfac\Documents\iicana-smart-learning
- Repositorio actualmente VACÍO
- Usar pnpm como package manager
- No hay proyecto en Supabase creado todavía (usar placeholders en .env)
- Metodología de desarrollo: Scrum (sprints de 2 semanas)
- Sprint 0 en curso: arquitectura, modelo de datos, mockups, plan de sprints
