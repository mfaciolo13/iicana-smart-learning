-- Migraciones 0014, 0016, 0017 y 0018 en orden. Pegar completo en el SQL Editor de Supabase y ejecutar.
BEGIN;

-- ===== 0014_payments_integrity =====
-- SCRUM-231/266: integridad de pagos.
--
-- 1) Un alumno con pagos no puede borrarse: antes el ON DELETE CASCADE eliminaba también
--    sus cuotas cobradas (incidente 2026-10-13). La app ya da de baja lógicamente a los
--    alumnos con historia; esto asegura que el borrado físico no ocurra por error.
-- 2) Una sola cuota vigente por alumno y vencimiento. Las anuladas no cuentan, para poder
--    volver a emitir la cuota. Antes sólo lo controlaba el código (carrera entre pedidos).

ALTER TABLE payments DROP CONSTRAINT payments_student_id_students_id_fk;
ALTER TABLE payments
  ADD CONSTRAINT payments_student_id_students_id_fk
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

-- Verificación previa (debe devolver 0 filas):
--   SELECT student_id, due_date, count(*) FROM payments
--   WHERE status <> 'cancelled' GROUP BY 1, 2 HAVING count(*) > 1;
CREATE UNIQUE INDEX payments_student_due_date_active_unique
  ON payments (student_id, due_date)
  WHERE status <> 'cancelled';

-- ===== 0016_survey_anonymity =====
-- SCRUM-250/280: la encuesta docente es anónima de verdad.
--
-- Antes teacher_surveys guardaba enrollment_id, y enrollments.student_id permitía saber
-- quién había opinado qué. Ahora "este alumno ya respondió" vive en una tabla aparte, sin
-- vínculo con el contenido de la respuesta, y teacher_surveys ya no referencia la inscripción.

CREATE TABLE teacher_survey_submissions (
  enrollment_id uuid PRIMARY KEY REFERENCES enrollments(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE
);
ALTER TABLE teacher_survey_submissions ENABLE ROW LEVEL SECURITY;

INSERT INTO teacher_survey_submissions (enrollment_id, course_id)
SELECT DISTINCT ON (enrollment_id) enrollment_id, course_id
FROM teacher_surveys
WHERE enrollment_id IS NOT NULL;

ALTER TABLE teacher_surveys DROP COLUMN enrollment_id;

-- Sin timestamp exacto no se puede cruzar la respuesta con el momento en que se envió.
UPDATE teacher_surveys SET created_at = date_trunc('week', created_at);

-- ===== 0017_payment_alert_marks =====
-- SCRUM-288: cada aviso de mora tiene su propia marca.
--
-- overdue_alert_sent_at pasa a significar únicamente "se avisó al alumno". El aviso a
-- Dirección (15 días de atraso) usa director_alert_sent_at; antes compartían la columna y
-- uno anulaba al otro.
ALTER TABLE payments ADD COLUMN director_alert_sent_at timestamptz;

-- ===== 0018_rls_least_privilege =====
-- SCRUM-277: las políticas de lectura "USING (true)" dejaban que cualquier usuario
-- autenticado leyera pagos, DNI, notas y asistencia de todos con la clave pública.
-- Ahora cada rol lee sólo lo que le corresponde:
--   director / administrativo -> todo lo operativo
--   profesor                 -> sus cursos y los alumnos inscriptos en ellos
--   alumno                   -> sus propios datos
-- Las escrituras siguen yendo por el servidor (Drizzle / service role), que no pasa por RLS.
-- Requiere 0016 (teacher_survey_submissions).

-- Helpers SECURITY DEFINER (bypassean RLS: evitan recursión entre políticas).
CREATE OR REPLACE FUNCTION public.current_student_id() RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT id FROM public.students WHERE profile_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.current_teacher_id() RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT id FROM public.teachers WHERE profile_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT coalesce(public.current_user_role() IN ('director', 'administrativo'), false) $$;

CREATE OR REPLACE FUNCTION public.teaches_course(p_course uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course AND teacher_id = public.current_teacher_id()) $$;

CREATE OR REPLACE FUNCTION public.teaches_enrollment(p_enrollment uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
    WHERE e.id = p_enrollment AND c.teacher_id = public.current_teacher_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_enrollment(p_enrollment uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.enrollments WHERE id = p_enrollment AND student_id = public.current_student_id()) $$;

CREATE OR REPLACE FUNCTION public.teaches_student(p_student uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = p_student AND c.teacher_id = public.current_teacher_id()
  )
$$;

CREATE OR REPLACE FUNCTION public.student_has_teacher(p_teacher uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = public.current_student_id() AND c.teacher_id = p_teacher
  )
$$;

CREATE OR REPLACE FUNCTION public.teaches_assessment(p_assessment uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE
AS $$ SELECT EXISTS (SELECT 1 FROM public.assessments WHERE id = p_assessment AND public.teaches_course(course_id)) $$;

REVOKE EXECUTE ON FUNCTION
  public.current_student_id(), public.current_teacher_id(), public.is_staff(),
  public.teaches_course(uuid), public.teaches_enrollment(uuid), public.owns_enrollment(uuid),
  public.teaches_student(uuid), public.student_has_teacher(uuid), public.teaches_assessment(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.current_student_id(), public.current_teacher_id(), public.is_staff(),
  public.teaches_course(uuid), public.teaches_enrollment(uuid), public.owns_enrollment(uuid),
  public.teaches_student(uuid), public.student_has_teacher(uuid), public.teaches_assessment(uuid)
TO authenticated;

-- Se eliminan las políticas abiertas.
DROP POLICY authenticated_select_payments ON public.payments;
DROP POLICY authenticated_select_students ON public.students;
DROP POLICY authenticated_select_teachers ON public.teachers;
DROP POLICY authenticated_select_enrollments ON public.enrollments;
DROP POLICY authenticated_select_grades ON public.grades;
DROP POLICY authenticated_select_attendance ON public.attendance;
DROP POLICY authenticated_select_assessments ON public.assessments;
DROP POLICY authenticated_select_assessment_attempts ON public.assessment_attempts;
DROP POLICY authenticated_select_class_observations ON public.class_observations;
DROP POLICY authenticated_select_teacher_surveys ON public.teacher_surveys;
-- courses queda abierta: sólo nombre, nivel y horario, sin datos personales.

-- payments: la información contable es de Dirección/administración y de cada alumno.
CREATE POLICY staff_select_payments ON public.payments FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY student_select_own_payments ON public.payments FOR SELECT TO authenticated
  USING (student_id = (SELECT public.current_student_id()));

-- students
CREATE POLICY staff_select_students ON public.students FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_own_students ON public.students FOR SELECT TO authenticated
  USING (public.teaches_student(id));
CREATE POLICY student_select_self ON public.students FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

-- teachers
CREATE POLICY staff_select_teachers ON public.teachers FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_self ON public.teachers FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));
CREATE POLICY student_select_own_teachers ON public.teachers FOR SELECT TO authenticated
  USING (public.student_has_teacher(id));

-- enrollments
CREATE POLICY staff_select_enrollments ON public.enrollments FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_course_enrollments ON public.enrollments FOR SELECT TO authenticated
  USING (public.teaches_course(course_id));
CREATE POLICY student_select_own_enrollments ON public.enrollments FOR SELECT TO authenticated
  USING (student_id = (SELECT public.current_student_id()));

-- grades y attendance (cuelgan de la inscripción)
CREATE POLICY staff_select_grades ON public.grades FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_course_grades ON public.grades FOR SELECT TO authenticated
  USING (public.teaches_enrollment(enrollment_id));
CREATE POLICY student_select_own_grades ON public.grades FOR SELECT TO authenticated
  USING (public.owns_enrollment(enrollment_id));

CREATE POLICY staff_select_attendance ON public.attendance FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_course_attendance ON public.attendance FOR SELECT TO authenticated
  USING (public.teaches_enrollment(enrollment_id));
CREATE POLICY student_select_own_attendance ON public.attendance FOR SELECT TO authenticated
  USING (public.owns_enrollment(enrollment_id));

-- assessments: las preguntas incluyen la respuesta correcta, así que el alumno NO las lee
-- por la API (la app se las entrega sin la clave correcta, vía servidor).
CREATE POLICY staff_select_assessments ON public.assessments FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_course_assessments ON public.assessments FOR SELECT TO authenticated
  USING (public.teaches_course(course_id));

CREATE POLICY staff_select_assessment_attempts ON public.assessment_attempts FOR SELECT TO authenticated
  USING ((SELECT public.is_staff()));
CREATE POLICY teacher_select_course_attempts ON public.assessment_attempts FOR SELECT TO authenticated
  USING (public.teaches_assessment(assessment_id));
CREATE POLICY student_select_own_attempts ON public.assessment_attempts FOR SELECT TO authenticated
  USING (student_id = (SELECT auth.uid()));

-- Evaluación docente: sólo Dirección.
CREATE POLICY director_select_class_observations ON public.class_observations FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'director');
CREATE POLICY director_select_teacher_surveys ON public.teacher_surveys FOR SELECT TO authenticated
  USING ((SELECT public.current_user_role()) = 'director');

-- "Ya respondí": el alumno ve sólo sus propias marcas.
CREATE POLICY student_select_own_survey_submissions ON public.teacher_survey_submissions FOR SELECT TO authenticated
  USING (public.owns_enrollment(enrollment_id));

COMMIT;
