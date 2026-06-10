-- Aplicado directamente en Supabase via MCP (consistencia con el resto del repo)
--
-- Antes, "profiles" solo tenia la policy "authenticated_select_own_profile"
-- (auth.uid() = id). Cualquier query del cliente Supabase (no Drizzle) que
-- necesitara el perfil de OTRO usuario -directo o via join anidado
-- (students(profiles(...)), teachers(profiles(...)))- recibia null/[] por RLS,
-- causando 404s y nombres/emails vacios en varias paginas.

-- Helper para leer el rol del usuario actual sin recursion en RLS
-- (SECURITY DEFINER ejecuta como el owner de la funcion, que bypassea RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Staff (admin/director, administrativo, profesor) puede leer todos los perfiles
-- Nota: current_user_role() envuelta en (select ...) para que Postgres la
-- evalue una sola vez por query (initplan) y no por cada fila -> evita timeouts
CREATE POLICY "staff_select_all_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select public.current_user_role()) IN ('admin', 'administrativo', 'profesor'));

-- Cualquier usuario autenticado puede leer perfiles de docentes
-- (nombres de profesores no son sensibles, se muestran en cursos/evaluaciones)
CREATE POLICY "authenticated_select_teacher_profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (role = 'profesor');
