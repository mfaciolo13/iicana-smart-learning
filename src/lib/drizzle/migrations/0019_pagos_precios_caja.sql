-- Módulo de Pagos v1.0: precios por medio de pago, caja de efectivo, comprobantes, cola de
-- correos y auditoría. Es ADITIVA: no borra ni reescribe datos existentes (sólo completa las
-- columnas nuevas de las cuotas ya cargadas).
--
-- Convenciones:
--  * `payments.amount` es el importe a cobrar: el precio de LISTA mientras la cuota está
--    impaga y lo efectivamente cobrado una vez pagada (así los reportes de recaudación
--    existentes siguen sumando lo que entró). El desglose queda en *_snapshot / discount_* /
--    surcharge_* / final_amount.
--  * Las tablas nuevas tienen RLS activado y SIN policies: sólo se leen/escriben desde el
--    servidor (Drizzle), nunca con la clave pública.
--  * cash_movements y audit_log son de sólo-agregar (trigger que impide UPDATE y DELETE) y por
--    eso NO llevan FK a profiles: el borrado de un usuario no debe tocarlos.

-- ─── Configuración económica ─────────────────────────────────────────────────
CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO app_settings (key, value) VALUES
  ('payments.rates', '{"transferDiscountPct":5,"cashDiscountPct":10,"cardSurchargePct":5,"discountLastDay":10}'::jsonb);

-- ─── Auditoría (sólo agregar) ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.forbid_row_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La tabla % es de sólo agregar: las correcciones se hacen con un movimiento compensatorio', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION public.forbid_row_mutation();

-- ─── Precios acordados por alumno ────────────────────────────────────────────
-- Plantilla con la que se precargan las cuotas nuevas del alumno (planilla `cuotas`).
CREATE TABLE student_fee_plans (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  list_price numeric(12,2) NOT NULL CHECK (list_price > 0),
  transfer_price numeric(12,2) CHECK (transfer_price IS NULL OR (transfer_price > 0 AND transfer_price <= list_price)),
  cash_price numeric(12,2) CHECK (cash_price IS NULL OR (cash_price > 0 AND cash_price <= list_price)),
  updated_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE student_fee_plans ENABLE ROW LEVEL SECURITY;

-- ─── Cuotas / pagos ──────────────────────────────────────────────────────────
ALTER TABLE payments
  ADD COLUMN period text,
  ADD COLUMN course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN transfer_price numeric(12,2),
  ADD COLUMN cash_price numeric(12,2),
  ADD COLUMN discount_valid_until date,
  ADD COLUMN list_price_snapshot numeric(12,2),
  ADD COLUMN discount_amount numeric(12,2),
  ADD COLUMN discount_percentage numeric(5,2),
  ADD COLUMN surcharge_amount numeric(12,2),
  ADD COLUMN final_amount numeric(12,2),
  ADD COLUMN provider text,
  ADD COLUMN provider_payment_id text,
  ADD COLUMN internal_reference text,
  ADD COLUMN external_reference text,
  ADD COLUMN registered_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE payments
  ADD CONSTRAINT payments_transfer_price_check CHECK (transfer_price IS NULL OR transfer_price > 0),
  ADD CONSTRAINT payments_cash_price_check CHECK (cash_price IS NULL OR cash_price > 0),
  ADD CONSTRAINT payments_provider_check CHECK (provider IS NULL OR provider IN ('manual', 'mercadopago'));

-- Cuotas ya cargadas: período, tope de descuento (día 10 del mes del vencimiento) y, para las
-- ya cobradas, el desglose "sin descuento" (se cobró lo que decía el importe).
UPDATE payments SET
  period = to_char(due_date, 'YYYY-MM'),
  discount_valid_until = (date_trunc('month', due_date) + interval '9 days')::date;
UPDATE payments SET
  list_price_snapshot = amount, final_amount = amount,
  discount_amount = 0, discount_percentage = 0, surcharge_amount = 0,
  provider = COALESCE(provider, 'manual')
WHERE status = 'paid';

CREATE INDEX idx_payments_period ON payments (period);
CREATE INDEX idx_payments_course_id ON payments (course_id);
CREATE UNIQUE INDEX payments_internal_reference_unique ON payments (internal_reference) WHERE internal_reference IS NOT NULL;
CREATE UNIQUE INDEX payments_provider_payment_unique ON payments (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;

-- ─── Caja de efectivo (libro de sólo agregar) ────────────────────────────────
CREATE TABLE cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq bigserial NOT NULL UNIQUE,
  movement_type text NOT NULL CHECK (movement_type IN ('income', 'withdrawal', 'adjustment')),
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  source_type text NOT NULL CHECK (source_type IN ('payment', 'manual', 'opening', 'reversal', 'adjustment')),
  source_id uuid,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  reason text NOT NULL CHECK (length(btrim(reason)) > 0),
  observations text,
  balance_before numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  reversal_of_id uuid REFERENCES cash_movements(id),
  created_by uuid,
  created_by_name text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cash_movements_balance_math CHECK (
    (direction = 'in' AND balance_after = balance_before + amount) OR
    (direction = 'out' AND balance_after = balance_before - amount)
  ),
  CONSTRAINT cash_movements_withdrawal_is_out CHECK (movement_type <> 'withdrawal' OR direction = 'out'),
  -- Sólo una corrección compensatoria puede dejar la caja en negativo (descuadre a investigar).
  CONSTRAINT cash_movements_no_negative CHECK (balance_after >= 0 OR source_type = 'reversal')
);
CREATE UNIQUE INDEX cash_movements_payment_unique ON cash_movements (source_id) WHERE source_type = 'payment';
CREATE UNIQUE INDEX cash_movements_reversal_unique ON cash_movements (reversal_of_id) WHERE reversal_of_id IS NOT NULL;
CREATE UNIQUE INDEX cash_movements_opening_unique ON cash_movements ((true)) WHERE source_type = 'opening';
CREATE INDEX cash_movements_created_idx ON cash_movements (created_at DESC);
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER cash_movements_append_only
  BEFORE UPDATE OR DELETE ON cash_movements
  FOR EACH ROW EXECUTE FUNCTION public.forbid_row_mutation();

-- Conciliación: conteo físico del efectivo contra el saldo del libro.
CREATE TABLE cash_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counted_amount numeric(12,2) NOT NULL CHECK (counted_amount >= 0),
  expected_amount numeric(12,2) NOT NULL,
  difference numeric(12,2) NOT NULL,
  notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cash_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER cash_reconciliations_append_only
  BEFORE UPDATE OR DELETE ON cash_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.forbid_row_mutation();

-- ─── Comprobantes y facturas ─────────────────────────────────────────────────
CREATE SEQUENCE payment_receipt_seq START 1;

CREATE TABLE payment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  document_type text NOT NULL CHECK (document_type IN ('receipt', 'invoice_c')),
  document_number text,
  fiscal_status text NOT NULL DEFAULT 'not_required'
    CHECK (fiscal_status IN ('not_required', 'pending', 'issued', 'failed')),
  amount numeric(12,2) NOT NULL,
  issued_at timestamptz,
  cae text,
  cae_expiration date,
  pos_number integer,
  voucher_number bigint,
  file_reference text,
  provider_response jsonb,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  access_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Un comprobante y una factura por pago, como máximo: la idempotencia de la emisión fiscal.
CREATE UNIQUE INDEX payment_documents_payment_type_unique ON payment_documents (payment_id, document_type);
CREATE UNIQUE INDEX payment_documents_number_unique ON payment_documents (document_type, document_number) WHERE document_number IS NOT NULL;
ALTER TABLE payment_documents ENABLE ROW LEVEL SECURITY;

-- ─── Cola de correos con reintentos ──────────────────────────────────────────
CREATE TABLE email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  recipient text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  html text NOT NULL,
  related_entity_type text,
  related_entity_id text,
  dedupe_key text UNIQUE,
  delivery_status text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_outbox_status_idx ON email_outbox (delivery_status, created_at);
CREATE INDEX email_outbox_related_idx ON email_outbox (related_entity_type, related_entity_id);
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;
