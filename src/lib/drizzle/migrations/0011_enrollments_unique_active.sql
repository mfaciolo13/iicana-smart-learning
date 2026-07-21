-- SCRUM-231: evitar inscripciones activas duplicadas del mismo alumno al mismo curso
-- (constraint de BD como red de seguridad final; el cupo máximo se serializa a nivel
-- de aplicación con SELECT ... FOR UPDATE sobre el curso, ya que "count <= N" no es
-- expresable como constraint declarativo)
CREATE UNIQUE INDEX enrollments_student_course_active_unique
  ON enrollments (student_id, course_id)
  WHERE status = 'active';
