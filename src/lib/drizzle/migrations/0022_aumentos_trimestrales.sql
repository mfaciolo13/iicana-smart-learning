-- Aumentos trimestrales de cuotas (módulo Configuraciones). Aditiva. Requiere 0019.
--
-- fee_increases: porcentaje configurado por Dirección para un trimestre. Un trimestre admite un
-- solo aumento vigente (programado o aplicado). Un aumento aplicado es inmutable: su porcentaje,
-- trimestre y vigencia no pueden cambiarse (trigger), para que ninguna edición posterior altere
-- retroactivamente cuotas o pagos históricos.
-- fee_price_history: precio anterior, nuevo y porcentaje de cada cuota o plan que tocó un aumento.
-- Es de sólo agregar y con índices únicos que impiden aplicar dos veces el mismo aumento a la misma cuota.

CREATE TABLE fee_increases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  percentage numeric(6,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 1000),
  quarter text NOT NULL CHECK (quarter ~ '^\d{4}-Q[1-4]$'),
  effective_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'applied', 'cancelled')),
  notes text,
  created_by uuid,
  created_by_name text,
  updated_by uuid,
  updated_by_name text,
  applied_at timestamptz,
  cancelled_at timestamptz,
  affected_payments integer,
  affected_plans integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- "No permitir aplicar dos veces el mismo aumento al mismo período": un trimestre, un aumento no cancelado.
CREATE UNIQUE INDEX fee_increases_one_per_quarter ON fee_increases (quarter) WHERE status <> 'cancelled';
CREATE INDEX fee_increases_due_idx ON fee_increases (status, effective_date);
ALTER TABLE fee_increases ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.protect_applied_fee_increase() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'applied' AND (
       NEW.percentage <> OLD.percentage OR NEW.quarter <> OLD.quarter OR
       NEW.effective_date <> OLD.effective_date OR NEW.status <> OLD.status) THEN
    RAISE EXCEPTION 'Un aumento aplicado no se puede modificar';
  END IF;
  IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Un aumento cancelado no se puede reactivar: programá uno nuevo';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fee_increases_protect_applied
  BEFORE UPDATE ON fee_increases
  FOR EACH ROW EXECUTE FUNCTION public.protect_applied_fee_increase();
CREATE OR REPLACE FUNCTION public.forbid_applied_fee_increase_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Los aumentos aplicados o cancelados se conservan como historial';
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER fee_increases_keep_history
  BEFORE DELETE ON fee_increases
  FOR EACH ROW EXECUTE FUNCTION public.forbid_applied_fee_increase_delete();

CREATE TABLE fee_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  increase_id uuid NOT NULL REFERENCES fee_increases(id) ON DELETE RESTRICT,
  scope text NOT NULL CHECK (scope IN ('payment', 'plan')),
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  student_id uuid REFERENCES students(id) ON DELETE RESTRICT,
  old_list numeric(12,2) NOT NULL,
  new_list numeric(12,2) NOT NULL,
  old_transfer numeric(12,2),
  new_transfer numeric(12,2),
  old_cash numeric(12,2),
  new_cash numeric(12,2),
  percentage numeric(6,2) NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fee_price_history_target CHECK (
    (scope = 'payment' AND payment_id IS NOT NULL) OR (scope = 'plan' AND student_id IS NOT NULL)
  )
);
CREATE UNIQUE INDEX fee_price_history_payment_unique ON fee_price_history (increase_id, payment_id) WHERE scope = 'payment';
CREATE UNIQUE INDEX fee_price_history_plan_unique ON fee_price_history (increase_id, student_id) WHERE scope = 'plan';
CREATE INDEX fee_price_history_payment_idx ON fee_price_history (payment_id);
ALTER TABLE fee_price_history ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER fee_price_history_append_only
  BEFORE UPDATE OR DELETE ON fee_price_history
  FOR EACH ROW EXECUTE FUNCTION public.forbid_row_mutation();
