-- QA 28/10 — integridad de las autoevaluaciones. Aditiva.
--
-- 1) assessment_answer_reveals: cuando el alumno confirma una pregunta, el servidor le muestra la
--    respuesta correcta. Antes no quedaba rastro: podía confirmar las 10 preguntas viendo cada
--    respuesta, recargar la página y volver a empezar sabiendo todo (100 %). Ahora la respuesta
--    elegida al confirmar queda registrada y es la que cuenta: recargar no permite cambiarla.
-- 2) Un intento por alumno y autoevaluación a nivel de base. Hasta ahora sólo lo garantizaba una
--    comprobación previa en el código (carrera entre dos envíos simultáneos).
--    Verificación previa (debe devolver 0 filas):
--      SELECT assessment_id, student_id, count(*) FROM assessment_attempts GROUP BY 1, 2 HAVING count(*) > 1;

CREATE TABLE assessment_answer_reveals (
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_index integer NOT NULL CHECK (question_index >= 0),
  chosen_index integer NOT NULL CHECK (chosen_index >= 0),
  correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_id, student_id, question_index)
);
ALTER TABLE assessment_answer_reveals ENABLE ROW LEVEL SECURITY;

ALTER TABLE assessment_attempts
  ADD CONSTRAINT assessment_attempts_assessment_student_unique UNIQUE (assessment_id, student_id);
