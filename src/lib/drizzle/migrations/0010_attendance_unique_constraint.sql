-- SCRUM-232: evitar asistencia duplicada para el mismo alumno inscripto en la misma fecha
ALTER TABLE attendance
  ADD CONSTRAINT attendance_enrollment_date_unique UNIQUE (enrollment_id, class_date);
