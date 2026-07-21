-- Anulación de pagos.
--
-- Un pago mal cargado (monto equivocado, alumno equivocado, cuota duplicada) no se
-- elimina: se anula. Borrar el registro rompería la trazabilidad contable — el número
-- de recibo quedaría huérfano y no habría forma de auditar qué pasó. La anulación
-- preserva el registro, lo saca de los totales y exige un motivo escrito.
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE payments
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN cancelled_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN cancellation_reason text;
