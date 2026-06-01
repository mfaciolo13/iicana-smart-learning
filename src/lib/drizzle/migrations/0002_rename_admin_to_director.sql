-- SCRUM-137: Renombrar valor del enum role: 'admin' → 'director'
-- Ejecutar manualmente en Supabase Dashboard > SQL Editor

ALTER TYPE role RENAME VALUE 'admin' TO 'director';
