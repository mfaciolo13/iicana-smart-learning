-- Verificación de las políticas de 0018_rls_least_privilege.sql (SCRUM-277).
-- Correr en el SQL Editor de Supabase DESPUÉS de aplicar 0014, 0016, 0017 y 0018.
-- No modifica datos: simula el JWT de cada rol y cuenta las filas visibles.
--
-- Esperado (con los datos de prueba actuales):
--   director / administrativo: ven todo (igual a la fila TOTAL).
--   profesor: sólo alumnos, inscripciones, notas y asistencia de sus cursos; 0 pagos.
--   alumno: sólo lo propio; 0 evaluaciones docentes, 0 autoevaluaciones (assessments),
--           0 observaciones de clase.

DO $do$
DECLARE r text := ''; rec record;
BEGIN
  FOR rec IN
    SELECT p.role::text AS rl, min(p.id::text) AS uid
    FROM profiles p
    GROUP BY p.role
  LOOP
    PERFORM set_config('request.jwt.claims', json_build_object('sub', rec.uid, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;
    r := r || rec.rl || ': pagos=' || (SELECT count(*) FROM payments)
      || ' alumnos=' || (SELECT count(*) FROM students)
      || ' docentes=' || (SELECT count(*) FROM teachers)
      || ' inscripciones=' || (SELECT count(*) FROM enrollments)
      || ' notas=' || (SELECT count(*) FROM grades)
      || ' asistencia=' || (SELECT count(*) FROM attendance)
      || ' autoevaluaciones=' || (SELECT count(*) FROM assessments)
      || ' intentos=' || (SELECT count(*) FROM assessment_attempts)
      || ' observaciones=' || (SELECT count(*) FROM class_observations)
      || ' encuestas=' || (SELECT count(*) FROM teacher_surveys)
      || ' marcas_encuesta=' || (SELECT count(*) FROM teacher_survey_submissions)
      || ' cursos=' || (SELECT count(*) FROM courses) || E'\n';
    RESET ROLE;
  END LOOP;

  r := r || 'TOTAL: pagos=' || (SELECT count(*) FROM payments)
    || ' alumnos=' || (SELECT count(*) FROM students)
    || ' docentes=' || (SELECT count(*) FROM teachers)
    || ' inscripciones=' || (SELECT count(*) FROM enrollments)
    || ' notas=' || (SELECT count(*) FROM grades)
    || ' asistencia=' || (SELECT count(*) FROM attendance)
    || ' autoevaluaciones=' || (SELECT count(*) FROM assessments)
    || ' intentos=' || (SELECT count(*) FROM assessment_attempts)
    || ' observaciones=' || (SELECT count(*) FROM class_observations)
    || ' encuestas=' || (SELECT count(*) FROM teacher_surveys)
    || ' marcas_encuesta=' || (SELECT count(*) FROM teacher_survey_submissions);

  -- Se aborta a propósito: el mensaje muestra el resultado y nada queda guardado.
  RAISE EXCEPTION E'RESULTADO (no es un error)\n%', r;
END
$do$;
