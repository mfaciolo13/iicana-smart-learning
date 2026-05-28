-- SCRUM-171: Agregar valor 'administrativo' al enum role en PostgreSQL
-- Aplicar en Supabase Dashboard > SQL Editor
-- ALTER TYPE ADD VALUE es no-destructivo y no requiere downtime

ALTER TYPE role ADD VALUE IF NOT EXISTS 'administrativo';

-- SCRUM-172: Actualizar políticas RLS para el rol administrativo
-- Las tablas operativas ya usan Drizzle (bypass RLS), pero se documentan
-- las políticas para consistencia con el modelo de seguridad de Supabase.

-- students: SELECT, INSERT, UPDATE para administrativo
-- (Las queries del servidor usan Drizzle con DATABASE_URL service role — no afectadas por RLS)
-- Ejecutar solo si existen políticas RLS explícitas en estas tablas:

/*
CREATE POLICY "admin_y_administrativo_pueden_ver_alumnos"
  ON students FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('admin', 'administrativo'));

CREATE POLICY "admin_y_administrativo_pueden_crear_alumnos"
  ON students FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'administrativo'));

CREATE POLICY "admin_y_administrativo_pueden_editar_alumnos"
  ON students FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('admin', 'administrativo'));

-- Repetir el mismo patrón para: enrollments, payments, attendance, complaints, notifications
*/
