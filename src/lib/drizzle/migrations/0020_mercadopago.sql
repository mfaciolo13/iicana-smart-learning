-- Pagos online con Mercado Pago (Checkout Pro). Aditiva. Requiere 0019.
--
-- payment_operations: un intento de pago electrónico de una cuota, con el importe CONGELADO al
-- iniciarlo (así una operación iniciada antes del día 10 no extiende el descuento más allá de su
-- vencimiento: expires_at). Sólo puede haber una operación activa (created/pending) por cuota.
-- payment_provider_events: cada notificación recibida, para trazabilidad e idempotencia.

CREATE TABLE payment_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('transfer', 'card')),
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'approved', 'rejected', 'cancelled', 'refunded', 'expired', 'duplicate', 'failed')),
  list_price_snapshot numeric(12,2) NOT NULL,
  discount_amount numeric(12,2) NOT NULL DEFAULT 0,
  discount_percentage numeric(5,2) NOT NULL DEFAULT 0,
  surcharge_amount numeric(12,2) NOT NULL DEFAULT 0,
  final_amount numeric(12,2) NOT NULL CHECK (final_amount > 0),
  currency text NOT NULL DEFAULT 'ARS',
  internal_reference text NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_preference_id text,
  provider_payment_id text,
  provider_status text,
  provider_status_detail text,
  init_point text,
  expires_at timestamptz NOT NULL,
  raw_response jsonb,
  created_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Una cuota no puede tener dos operaciones vivas a la vez: evita cobrarla dos veces en paralelo.
CREATE UNIQUE INDEX payment_operations_one_active_per_payment
  ON payment_operations (payment_id) WHERE status IN ('created', 'pending');
-- Un pago del proveedor pertenece a una sola operación.
CREATE UNIQUE INDEX payment_operations_provider_payment_unique
  ON payment_operations (provider, provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE INDEX payment_operations_student_idx ON payment_operations (student_id);
CREATE INDEX payment_operations_status_idx ON payment_operations (status, expires_at);
ALTER TABLE payment_operations ENABLE ROW LEVEL SECURITY;

CREATE TABLE payment_provider_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  event_key text NOT NULL UNIQUE,
  topic text,
  resource_id text,
  payload jsonb,
  outcome text,
  error_message text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_provider_events_resource_idx ON payment_provider_events (resource_id);
ALTER TABLE payment_provider_events ENABLE ROW LEVEL SECURITY;
