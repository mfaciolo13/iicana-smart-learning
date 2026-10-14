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
