-- SCRUM-137: Renombrar valor del enum role: 'admin' → 'director'
-- Aplicado directamente en Supabase via MCP el 2026-06-10 (SCRUM-226):
-- esta migracion nunca se habia ejecutado en produccion, por lo que
-- profiles.role seguia almacenando 'admin' y la pestaña "Directores"
-- de /director/users?role=director nunca encontraba coincidencias.

ALTER TYPE role RENAME VALUE 'admin' TO 'director';
