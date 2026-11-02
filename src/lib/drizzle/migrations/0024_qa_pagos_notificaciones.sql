-- QA 28/10 — pagos, notificaciones y RLS. Aditiva (salvo el índice único, que falla si ya hay duplicados).

-- 1) Marca de envío de los procesos automáticos (recordatorio de clase, recordatorio de pago, reporte
--    diario). Antes sólo la alerta de mora registraba qué había enviado: una segunda ejecución (por ejemplo
--    "Ejecutar ahora" media hora después del proceso de las 20:00) repetía todos los correos.
CREATE TABLE automation_sends (
  kind text NOT NULL,
  dedupe_key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, dedupe_key)
);
ALTER TABLE automation_sends ENABLE ROW LEVEL SECURITY;

-- 2) Una sola cuota vigente por alumno y MES (antes: por fecha exacta, así 10/11 y 11/11 convivían).
--    Verificación previa (debe devolver 0 filas); si hay duplicados, anular uno antes de crear el índice:
--      SELECT student_id, (due_date - (EXTRACT(day FROM due_date)::int - 1)) AS month, count(*)
--      FROM payments WHERE status <> 'cancelled' GROUP BY 1, 2 HAVING count(*) > 1;
CREATE UNIQUE INDEX payments_student_month_active_unique
  ON payments (student_id, (due_date - (EXTRACT(day FROM due_date)::int - 1)))
  WHERE status <> 'cancelled';

-- 3) Policies que existían en la base pero no estaban versionadas (un entorno nuevo creado desde las
--    migraciones habría dejado abiertas notifications y complaints). Idempotente: reproduce las vivas.
DROP POLICY IF EXISTS authenticated_select_own_notifications ON notifications;
CREATE POLICY authenticated_select_own_notifications ON notifications
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS authenticated_select_own_complaints ON complaints;
CREATE POLICY authenticated_select_own_complaints ON complaints
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
