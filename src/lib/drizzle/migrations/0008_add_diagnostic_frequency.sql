-- SCRUM-213: Autoevaluación diagnóstica periódica
-- diagnostic_frequency: cada cuántas clases se genera una autoevaluación automática (0 = desactivado)
ALTER TABLE courses
  ADD COLUMN diagnostic_frequency INTEGER NOT NULL DEFAULT 0;
