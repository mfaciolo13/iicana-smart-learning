-- SCRUM-231/266: integridad de pagos.
--
-- 1) Un alumno con pagos no puede borrarse: antes el ON DELETE CASCADE eliminaba también
--    sus cuotas cobradas (incidente 2026-10-13). La app ya da de baja lógicamente a los
--    alumnos con historia; esto asegura que el borrado físico no ocurra por error.
-- 2) Una sola cuota vigente por alumno y vencimiento. Las anuladas no cuentan, para poder
--    volver a emitir la cuota. Antes sólo lo controlaba el código (carrera entre pedidos).

ALTER TABLE payments DROP CONSTRAINT payments_student_id_students_id_fk;
ALTER TABLE payments
  ADD CONSTRAINT payments_student_id_students_id_fk
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT;

-- Verificación previa (debe devolver 0 filas):
--   SELECT student_id, due_date, count(*) FROM payments
--   WHERE status <> 'cancelled' GROUP BY 1, 2 HAVING count(*) > 1;
CREATE UNIQUE INDEX payments_student_due_date_active_unique
  ON payments (student_id, due_date)
  WHERE status <> 'cancelled';
