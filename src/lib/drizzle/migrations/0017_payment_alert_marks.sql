-- SCRUM-288: cada aviso de mora tiene su propia marca.
--
-- overdue_alert_sent_at pasa a significar únicamente "se avisó al alumno". El aviso a
-- Dirección (15 días de atraso) usa director_alert_sent_at; antes compartían la columna y
-- uno anulaba al otro.
ALTER TABLE payments ADD COLUMN director_alert_sent_at timestamptz;
