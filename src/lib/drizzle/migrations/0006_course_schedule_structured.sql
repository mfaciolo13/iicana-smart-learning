-- SCRUM-217: Migrar courses.schedule (texto libre) a campos estructurados
-- class_days (array de dias), class_time (hora de inicio) y class_duration_minutes

CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

ALTER TABLE courses
  ADD COLUMN class_days day_of_week[] NOT NULL DEFAULT '{}',
  ADD COLUMN class_time TIME,
  ADD COLUMN class_duration_minutes INTEGER NOT NULL DEFAULT 90;

-- Migracion de datos existentes (script asistido — los 3 valores cubren todos los cursos actuales)
UPDATE courses SET class_days = '{tuesday,thursday}', class_time = '19:15' WHERE schedule = 'Mar/Jue 19:15–20:45';
UPDATE courses SET class_days = '{monday,wednesday}', class_time = '19:00' WHERE schedule = 'Lun/Mié 19:00–20:30';
UPDATE courses SET class_days = '{monday,wednesday}', class_time = '18:00' WHERE schedule = 'Lun/Mié 18:00–19:30';

ALTER TABLE courses ALTER COLUMN class_time SET NOT NULL;
