-- Corrección de asistencia: una toma de lista mal cargada debe poder corregirse,
-- pero la corrección tiene que quedar registrada (quién y cuándo). Sin esta traza,
-- un cambio de "ausente" a "presente" sería indistinguible del registro original,
-- y la asistencia es el insumo del cálculo de promoción (umbral 80%).
ALTER TABLE attendance
  ADD COLUMN updated_at timestamptz,
  ADD COLUMN updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
