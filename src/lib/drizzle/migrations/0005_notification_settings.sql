-- SCRUM-216: Configuración global de alertas (director) y preferencias por usuario (opt-out)

CREATE TYPE alert_type AS ENUM ('class_reminder', 'absence', 'payment_reminder', 'grade_published');

CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type alert_type NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  timing_hours INTEGER NOT NULL DEFAULT 24, -- solo aplica a class_reminder
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, alert_type)
);

-- Seed inicial: las 4 alertas activas por defecto
INSERT INTO notification_settings (alert_type, enabled, timing_hours) VALUES
  ('class_reminder', true, 24),
  ('absence', true, 24),
  ('payment_reminder', true, 24),
  ('grade_published', true, 24)
ON CONFLICT (alert_type) DO NOTHING;

-- RLS
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- notification_settings: solo el director puede leer y escribir
CREATE POLICY "director_select_notification_settings"
  ON notification_settings FOR SELECT
  TO authenticated
  USING ((select public.current_user_role()) = 'director');

CREATE POLICY "director_update_notification_settings"
  ON notification_settings FOR UPDATE
  TO authenticated
  USING ((select public.current_user_role()) = 'director');

-- user_notification_preferences: cada usuario lee y escribe solo sus propias filas
-- auth.uid() envuelta en (select ...) para evitar re-evaluacion por fila (initplan)
CREATE POLICY "users_select_own_notification_preferences"
  ON user_notification_preferences FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "users_insert_own_notification_preferences"
  ON user_notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "users_update_own_notification_preferences"
  ON user_notification_preferences FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()));
