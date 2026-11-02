-- Facturación electrónica (Factura C) con ARCA. Aditiva. Requiere 0019.
--
-- arca_access_tickets guarda el ticket de acceso de WSAA (token + sign, ~12 h): WSAA rechaza
-- pedir uno nuevo mientras haya uno vigente, así que todas las instancias del servidor deben
-- compartirlo. Es un secreto operativo: RLS activado y sin policies.

CREATE TABLE arca_access_tickets (
  service text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('homologacion', 'produccion')),
  token text NOT NULL,
  sign text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service, environment)
);
ALTER TABLE arca_access_tickets ENABLE ROW LEVEL SECURITY;

-- Política de facturación de los cobros en efectivo (pendiente de confirmar por la dirección):
-- por defecto sólo los pagos electrónicos se facturan solos; el efectivo se factura a pedido.
INSERT INTO app_settings (key, value) VALUES ('payments.invoicing', '{"autoInvoiceCash":false}'::jsonb)
  ON CONFLICT (key) DO NOTHING;
