# Auditoría técnica — Dev / Tech Lead (campaña QA oct-2026)

Fecha: 13/10/2026 · Rama `main` @ `5207074` · Alcance: `src/modules/*`, `src/app/**`, `src/lib/**`, `src/proxy.ts`, config e infraestructura.

> Fase 1 cerrada. No se modificó ningún archivo del repo: los fixes van como diff sugerido. **47 hallazgos: 3 Críticos, 12 Altos, 22 Medios, 10 Bajos** (DEV-047 agregado en fase 2: cuelgue de Drizzle). Resumen y orden de ataque en la §3. La causa raíz de los 40 hallazgos de QA (fase 2) está en la §4.
>
> **Aviso urgente:** producción usa el mismo proyecto Supabase que dev y los tests (DEV-005), y hay dos vulnerabilidades críticas explotables hoy en producción: DEV-001 (toma de cuentas por `/invite`) y DEV-002 (auto-escalada a director vía RLS). Los QA están escribiendo datos en la base de producción.

## 0. Resultados de las herramientas de calidad

| Herramienta | Comando | Resultado |
|---|---|---|
| TypeScript | `pnpm tsc --noEmit` | OK: 0 errores (exit 0) |
| ESLint | `pnpm lint` | OK: 0 errores, 0 warnings (exit 0). Los 8 warnings de E-05 en `hallazgos.md` ya no aparecen |
| Vitest | `pnpm test` | OK: 6 archivos, 159 tests, todos pasan (2,2 s) |

Que las tres herramientas estén en verde **no** cubre los hallazgos de abajo: casi todos son de autorización, de datos o de lógica de negocio, y ninguno lo detecta un type-check ni los tests unitarios actuales (que testean funciones puras, no actions ni policies).

### Método

- Lectura de código módulo por módulo (actions, services, páginas y API routes).
- Introspección **de solo lectura** de la base de dev (`pg_class.relrowsecurity`, `pg_policies`, `information_schema.role_table_grants`, `storage.buckets`, `pg_indexes`). La verificación de DEV-002 y DEV-003 se hizo dentro de una transacción con `ROLLBACK` y se confirmó que el rol quedó sin cambios. DEV-001 se verificó solo por lectura de código: no se ejecutó contra cuentas reales.
- Deduplicación contra `docs/qa-backlog.md` (SCRUM-234..259) y `docs/hallazgos.md`.

## 1. Hallazgos

### DEV-001 · El link de invitación permite tomar cualquier cuenta sin autenticarse (incluida la del director)

- **Tipo:** Seguridad · **Severidad:** Crítica
- **Archivo:línea:** `src/app/(auth)/invite/[encoded]/page.tsx:9-31` (server action `claimInvite`), links generados en `src/modules/students/actions.ts:86`, `src/modules/teachers/actions.ts:85`, `src/modules/users/actions.ts:77` y `:150`
- **Descripción y cómo se dispara:** el "token" de invitación es `base64url(email)`: no es secreto, no expira y no es de un solo uso. Además, `claimInvite` ni siquiera usa el segmento de la URL: toma `email` del `FormData` (un `<input type="hidden">`), llama a `auth.admin.generateLink({ type: "recovery", email })` con la **service role** y hace `redirect()` del navegador del atacante al `action_link`. Ese link loguea al visitante como el dueño del email y lo manda a `/update-password`.
  1. El atacante abre `/invite/<base64url("director@…")>` (o cualquier `/invite/x` y edita el hidden input). No necesita sesión: `/invite` no está en `PROTECTED_PREFIXES`.
  2. Click en "Establecer contraseña" → queda logueado como el director y le cambia la contraseña.
  - No importa si la cuenta ya está activa: no se chequea `last_sign_in_at`.
  - Los emails son fáciles de conseguir: los de docentes los puede leer cualquier autenticado por la policy `authenticated_select_teacher_profiles`, y los institucionales son predecibles.
- **Impacto:** toma de cuenta sin credenciales, de cualquier rol, en producción. Acceso total a datos personales (DNI, pagos, notas), creación y baneo de usuarios, cambio de contraseña del dueño legítimo. Es el hallazgo más grave de la auditoría.
- **Fix propuesto:** token aleatorio de un solo uso con expiración, guardado hasheado. La página intermedia con botón se mantiene, porque protege contra los scanners de email que "consumen" links al previsualizar.
  ```sql
  -- migración 0014_invitations.sql
  CREATE TABLE invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE invitations ENABLE ROW LEVEL SECURITY; -- sin policies: solo server
  ```
  ```ts
  // src/lib/invitations.ts (nuevo)
  export async function createInvitation(userId: string) {
    const token = randomBytes(32).toString("base64url");
    await db.update(invitations).set({ usedAt: new Date() })
      .where(and(eq(invitations.userId, userId), isNull(invitations.usedAt))); // invalida las anteriores
    await db.insert(invitations).values({
      userId, tokenHash: sha256(token), expiresAt: addHours(new Date(), 72),
    });
    return `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${token}`; // no usar el header Host
  }
  ```
  ```diff
   async function claimInvite(formData: FormData) {
     "use server";
  -  const email = formData.get("email") as string;
  +  const token = formData.get("token") as string;
  +  // UPDATE … SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id
  +  const inv = await consumeInvitation(token);  // atómico: un solo uso
  +  if (!inv) redirect("/login?invite=invalid");
  +  const email = await getEmailByUserId(inv.userId);
     ...
  -    options: { redirectTo: `${siteUrl}/update-password` },
  +    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password` },
  ```
  La página `InvitePage` valida el token (sin consumirlo) para mostrar el email, y el form manda `token`, no `email`. Mientras tanto, como mitigación inmediata (S): que `claimInvite` rechace las cuentas con `last_sign_in_at` seteado. Eso protege a las cuentas ya activas, entre ellas la del director, pero no a las pendientes.
- **Esfuerzo:** M
- **Cómo verificarlo:** en dev, sin sesión, abrir `/invite/<base64url(email de e2e-admin)>` y apretar el botón. **Hoy** termina en `/update-password` con la sesión de ese usuario. Con el fix: un token inventado o ya usado devuelve `/login?invite=invalid`, y un token válido funciona una sola vez.

---

### DEV-002 · Cualquier usuario autenticado puede darse el rol `director` editando su fila de `profiles` vía la API de Supabase (y el registro público está abierto)

- **Tipo:** Seguridad · **Severidad:** Crítica
- **Archivo:línea:** base de datos: policies `authenticated_update_own_profile` (UPDATE `USING (auth.uid() = id)`, **sin `WITH CHECK` y sin restricción de columnas**) y `authenticated_insert_profile` (INSERT `WITH CHECK (auth.uid() = id)`) sobre `public.profiles`. Además, el rol `authenticated` tiene `INSERT/UPDATE/DELETE/TRUNCATE` a nivel tabla en **todas** las tablas de `public` (el default de Supabase). Código relacionado: `src/modules/auth/actions.ts:48-61` y `:88-107`.
- **Descripción y cómo se dispara:** la publishable key está en el bundle del navegador (por diseño). Con su propio JWT, un alumno ejecuta:
  ```js
  await supabase.from("profiles").update({ role: "director" }).eq("id", miUserId)
  ```
  `requireRole()` y todos los layouts leen el rol de `profiles`, así que en el siguiente request ya es director.
  **Verificado** en la base de dev dentro de una transacción con `ROLLBACK`: con `SET ROLE authenticated` y el claim `sub` del alumno `e2e-alumno@…`, el `UPDATE profiles SET role='director'` devolvió 1 fila. El rol se confirmó intacto después del rollback.
  Hay un vector sin cuenta previa: el proyecto tiene `disable_signup: false` (`GET /auth/v1/settings`). Cualquiera puede hacer `supabase.auth.signUp({ email, password, options: { data: { role: "director" } } })`, confirmar el email y:
  - insertar su propia fila de `profiles` con `role: 'director'` (la policy de INSERT no restringe la columna), o
  - entrar por `/login`: `loginAction` crea el perfil faltante con `role: meta.role` (`user_metadata`, que controla el usuario).
- **Impacto:** escalada de privilegios a director desde cualquier cuenta, o desde ninguna. Acceso y mutación de todo el sistema.
- **Fix propuesto:**
  ```sql
  -- migración 0014_lockdown_rls.sql
  -- 1) El servidor escribe solo con Drizzle (rol postgres) o con la service role; el cliente nunca escribe.
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;
  DROP POLICY "authenticated_update_own_profile" ON public.profiles;
  DROP POLICY "authenticated_insert_profile" ON public.profiles;
  -- 2) Defensa en profundidad: el rol solo cambia desde el servidor
  CREATE OR REPLACE FUNCTION public.protect_profile_role() RETURNS trigger
  LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND current_user IN ('authenticated','anon') THEN
      RAISE EXCEPTION 'role is read-only';
    END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER profiles_protect_role BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();
  ```
  - Supabase Dashboard → Auth → **deshabilitar "Allow new users to sign up"**: las altas son solo por `auth.admin.createUser`.
  - `loginAction`: si no hay perfil, **no** crear uno a partir de `user_metadata`. Cerrar la sesión y devolver error ("Tu cuenta no está habilitada, contactá a la institución").
  - Borrar `registerAction` y `registerSchema` (no hay página `/register`: es código muerto con superficie de ataque).
  - Revisado: hoy ninguna escritura de la app usa el cliente con JWT de usuario, salvo los dos `insert` de `auth/actions.ts`. Todas las demás van por Drizzle o por `createServiceClient()`, así que el `REVOKE` no rompe funcionalidad.
- **Esfuerzo:** S (SQL + config) · M si se suma el trigger y los tests
- **Cómo verificarlo:** con el JWT de un alumno, `supabase.from("profiles").update({role:"director"}).eq("id", uid)` tiene que dar `0 rows`/`permission denied`. `POST /auth/v1/signup` tiene que responder `Signups not allowed`. La query `select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated')` tiene que devolver solo `SELECT`.

---

### DEV-003 · Las policies RLS de lectura son `USING (true)`: cualquier autenticado lee pagos, DNI, notas y asistencia de todos, y puede desanonimizar las encuestas docentes

- **Tipo:** Seguridad · **Severidad:** Alta
- **Archivo:línea:** base de datos. Policies `authenticated_select_*` con `qual = true` en `students`, `payments`, `grades`, `attendance`, `enrollments`, `assessment_attempts`, `assessments` (con el campo `correct` de cada pregunta), `teacher_surveys`, `class_observations`, `teachers`, `courses`. El repo no tiene la migración base que las creó (solo están documentadas parcialmente en `0001`/`0004`).
- **Descripción y cómo se dispara:** cualquier alumno logueado, desde la consola del navegador:
  - `supabase.from("students").select("*")` devuelve el DNI, la fecha de nacimiento y el estado de todos los alumnos.
  - `from("payments").select("*")` devuelve los pagos de todos.
  - `from("assessments").select("questions")` devuelve las preguntas con la respuesta correcta.
  - `from("teacher_surveys").select("*, enrollment_id")` trae el `enrollment_id`, que se une con `enrollments.student_id`: **rompe el anonimato** de las evaluaciones docentes, que es justamente la justificación D-08 de `hallazgos.md`.
  - Un profesor puede leer las observaciones de clase de otros docentes.
  **Verificado** con `SET ROLE authenticated` + el claim del alumno E2E: el alumno ve 6/6 pagos, 9/9 alumnos, 8/8 notas y 4/4 encuestas de la base.
- **Impacto:** fuga de datos personales (DNI y datos de menores, Ley 25.326 de Protección de Datos Personales), trampa en las autoevaluaciones y anonimato de las encuestas roto.
- **Fix propuesto:** casi todas las lecturas del servidor van por Drizzle (que bypassea RLS). El cliente Supabase con el JWT del usuario se usa en algunas páginas (`createClient()` del server en ~40 páginas) y en el Realtime de `Topbar.tsx` (notifications). Dos opciones:
  - **A (recomendada, M):** migrar esas lecturas a Drizzle o a `createServiceClient()` **después** de autorizar en el servidor, y dejar el cliente solo para `notifications` (Realtime):
    ```sql
    DROP POLICY authenticated_select_students ON students;  -- ídem payments, grades, attendance,
    -- enrollments, assessments, assessment_attempts, teacher_surveys, class_observations, teachers, courses
    REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    GRANT SELECT ON public.notifications TO authenticated;  -- ya tiene policy "own"
    GRANT SELECT ON public.profiles TO authenticated;       -- con policies own/staff
    ```
  - **B (L):** policies por rol, por ejemplo `payments`: `USING (current_user_role() IN ('director','administrativo') OR student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()))`, y lo mismo en cada tabla. `teacher_surveys` solo para `director`. Es más trabajo y es fácil equivocarse.
  - En las dos opciones, además, sacar `staff_select_all_profiles` para `profesor`: hoy un docente lee emails y teléfonos de todos los alumnos e incluso de otros staff.
- **Esfuerzo:** M (opción A)
- **Cómo verificarlo:** con el JWT del alumno E2E, `select count(*)` sobre `students/payments/grades/teacher_surveys` vía PostgREST tiene que devolver `0`/`permission denied`, y los 4 portales tienen que seguir funcionando (smoke de QA).

---

### DEV-004 · `proxy.ts` decide el acceso del administrativo con `user_metadata.role` (editable por el usuario) y las páginas "solo director" no revalidan el rol

- **Tipo:** Seguridad · **Severidad:** Alta
- **Archivo:línea:** `src/proxy.ts:59-68`; `src/app/(dashboard)/director/layout.tsx:9` (deja pasar a `administrativo`); páginas sin chequeo propio: `director/users/page.tsx`, `director/users/[id]/page.tsx`, `director/teachers/**`, `director/courses/**`, `director/marketing/**`, `director/teacher-evaluations/**`, `director/year-end`, `director/promotions/**`, `director/settings/**`, `director/assessments/**`
- **Descripción y cómo se dispara:** `user_metadata` lo puede modificar el propio usuario con `supabase.auth.updateUser({ data: { role: "director" } })`, usando solo la publishable key. Un administrativo que lo hace ya no matchea `role === "administrativo"` en el proxy, y el layout de `/director` lo acepta. Resultado: ve `/director/users` (todos los usuarios con email y teléfono), `/director/teachers` (DNI de docentes), las evaluaciones docentes, las observaciones de clase, la configuración, etc. Las **mutaciones** siguen protegidas porque `requireRole(["director"])` lee `profiles`, pero la **lectura** queda expuesta.
  Lo mismo pasa si el metadata queda desincronizado: `updateUserAction` cambia `profiles.role` pero no `user_metadata.role`. Un usuario promovido de `profesor` a `administrativo` desde la UI conserva `role: "profesor"` en el metadata y el proxy nunca lo bloquea (confirmado: `users.service.ts:64-76` solo hace `db.update(profiles)`).
  Además, `ADMIN_ONLY_ROUTES` no incluye `/director/risk` ni `/director/documents`. Confirmar con el BA si el administrativo debe verlas.
- **Impacto:** el administrativo accede en lectura a las secciones restringidas. La autorización de las páginas depende de un único punto (el proxy, que corre en el edge y además excluye `/api/*` del matcher).
- **Fix propuesto:** autorizar en el servidor con el rol de `profiles`, no en el proxy.
  ```tsx
  // src/app/(dashboard)/director/(director-only)/layout.tsx  — route group que agrupa
  // users, teachers, courses, marketing, teacher-evaluations, assessments, year-end, promotions, settings
  export default async function DirectorOnlyLayout({ children }: { children: ReactNode }) {
    const profile = await getServerProfile();
    if (profile?.role !== "director") redirect("/403");
    return <>{children}</>;
  }
  ```
  Así se puede quitar la lógica de rol del proxy: si se mantiene como optimización, que use `app_metadata.role`, que solo escribe la service role. Si no se quiere mover carpetas, alcanza con una línea `await requireDirectorPage()` al inicio de cada `page.tsx` listado.
- **Esfuerzo:** S-M
- **Cómo verificarlo:** logueado como administrativo E2E, ejecutar en la consola `supabase.auth.updateUser({data:{role:"director"}})`, refrescar el token y navegar a `/director/users`. Hoy carga; con el fix tiene que redirigir a `/403`.

---

### DEV-005 · Producción, dev y tests E2E usan el **mismo** proyecto Supabase y la misma base

- **Tipo:** Infra / Seguridad · **Severidad:** Crítica
- **Archivo:línea:** `.env.local` y `.env.test` (sin versionar), `scripts/seed-e2e.ts:25-26` y `:43` (`TEST_PASSWORD` hardcodeado), `playwright.config.ts:5`
- **Descripción y cómo se dispara:**
  - `.env.local` y `.env.test` tienen **idénticos** `NEXT_PUBLIC_SUPABASE_URL` y `DATABASE_URL`. Lo comprobé comparando los valores, sin imprimirlos.
  - El bundle público de `https://www.cervantes-smart-learning.com.ar/update-password` referencia ese mismo project ref (`wdjz…`). O sea que **producción, el `pnpm dev` que están usando los QA, el seed E2E y Playwright escriben en la misma base**.
  - El propio seed lo contradice: dice "NUNCA correr contra la base de producción. Usa exclusivamente .env.test", pero `.env.test` apunta a producción.
  - Consecuencias:
    1. `pnpm seed:e2e` hace `DELETE` en producción por prefijo `E2E%` y por dominio `@e2e.test`, incluido `auth.admin.deleteUser`. Cualquier dato real que matchee se pierde, y un cambio en ese filtro borraría datos reales.
    2. Existen en producción cuentas `director@e2e.test` (rol director) con la contraseña `E2e-Test-2026!`. Está versionada en `scripts/seed-e2e.ts:43`, así que la conoce cualquiera con acceso al repo (hoy privado) o a un fork o backup. Hay además usuarios `e2e-*@cervantes-smart-learning.com.ar`, con credenciales en `.env.local`.
    3. Los QA de esta campaña están generando datos `E2E QA1/QA2` en producción, y los crons de producción les mandan emails o notificaciones.
    4. Las migraciones se prueban directo en producción (A-01 de `hallazgos.md` se aplicó así).
    5. La caché `unstable_cache` del dev no se entera de los cambios del seed (ya documentado en qa-backlog), y lo mismo pasa en sentido inverso con producción.
  - Esta misma auditoría hizo introspección de solo lectura sobre esa base: los conteos de DEV-003 corresponden a esa base, que hoy es también la de producción.
- **Impacto:** riesgo de pérdida de datos de producción, una cuenta director con contraseña conocida en producción, datos de prueba mezclados con datos reales y emails a usuarios reales disparados por pruebas.
- **Fix propuesto:**
  1. Crear un proyecto Supabase **de test/dev separado** (free tier). Aplicarle las migraciones 0001-0013 más el schema base, y apuntar `.env.test` y `.env.local` a ese proyecto.
  2. Agregar un guard al seed:
     ```ts
     const PROD_REF = "wdjz…"; // o process.env.PROD_SUPABASE_REF
     if (SUPABASE_URL.includes(PROD_REF)) throw new Error("seed-e2e: refusing to run against PRODUCTION");
     ```
  3. En producción, borrar las cuentas `@e2e.test` y `e2e-*` (o banearlas) y rotar las contraseñas que estuvieron en `.env.local`.
  4. Mover `TEST_PASSWORD` a una variable de entorno.
  5. Cuando el proyecto separado exista, rotar `SUPABASE_SECRET_KEY` de producción: hoy está en las máquinas de dev y en `.env.test`.
- **Esfuerzo:** M
- **Cómo verificarlo:** `.env.local`/`.env.test` y el project ref de Vercel Production difieren. Correr `pnpm seed:e2e` con la URL de producción aborta. `select count(*) from profiles where email like '%@e2e.test'` en producción da 0.

---

### DEV-006 · Funciones en `iad1` (EE.UU. Este) contra una base en `us-west-2` (EE.UU. Oeste), para usuarios en Córdoba

- **Tipo:** Rendimiento / Infra · **Severidad:** Media
- **Archivo:línea:** `vercel.json:2` (`"regions": ["iad1"]`); host del pooler `aws-1-us-west-2.pooler.supabase.com` (`DATABASE_URL`)
- **Descripción y cómo se dispara:** cada query de Drizzle hace un viaje Virginia ↔ Oregón (unos 60-70 ms de RTT). Con `max: 1` las queries de una página van una detrás de otra: una página con 10-15 queries suma entre 0,7 y 1 s solo de red. A eso se le agrega el tramo usuario → edge `gru1` (São Paulo, visto en `x-vercel-id`) → `iad1`. El proxy además llama a `auth.getUser()` contra Supabase (Oregón) en **cada** navegación.
- **Impacto:** TTFB alto en todos los portales. Esto agrava la "lentitud" que reportó QA y hace más probables los timeouts de `connect_timeout: 10`.
- **Fix propuesto:** que la región de las funciones coincida con la de la base: `"regions": ["pdx1"]` (Portland, cerca de us-west-2). Si a futuro el proyecto Supabase se recrea en `sa-east-1` (São Paulo), cambiar a `"gru1"`, que es lo ideal para Argentina. Combinar con DEV-005: el proyecto nuevo de producción conviene crearlo en `sa-east-1`.
  ```diff
  -  "regions": ["iad1"],
  +  "regions": ["pdx1"],
  ```
- **Esfuerzo:** S (región de Vercel) · M (migrar el proyecto Supabase)
- **Cómo verificarlo:** medir el TTFB de `/director` con `curl -w "%{time_starttransfer}"` antes y después, y mirar `Server-Timing`/logs de Vercel.

---

### DEV-007 · No hay headers de seguridad (CSP, anti-clickjacking, nosniff, Referrer-Policy)

- **Tipo:** Seguridad / Infra · **Severidad:** Media
- **Archivo:línea:** `next.config.ts:4-13` (no tiene `headers()`); `vercel.json`
- **Descripción y cómo se dispara:** la respuesta de producción (`GET /login`) solo trae `strict-transport-security`, que agrega Vercel. Faltan:
  - `X-Frame-Options`/`frame-ancestors`: un sitio externo puede embeber `/director/...` en un iframe y hacer clickjacking sobre botones como "Banear" o "Consolidar ciclo".
  - `X-Content-Type-Options: nosniff`.
  - `Referrer-Policy`: los links `/invite/<token>` se filtran por Referer.
  - `Permissions-Policy` y una CSP mínima.
  - Además, las páginas prerenderizadas responden `access-control-allow-origin: *`.
- **Impacto:** facilita el clickjacking y la exfiltración por Referer, y no hay ninguna mitigación ante un XSS.
- **Fix propuesto:**
  ```ts
  // next.config.ts
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
      ],
    }];
  },
  ```
  La CSP de `script-src` con nonce se puede agregar después. Consultar `node_modules/next/dist/docs/` (CSP con proxy en Next 16).
- **Esfuerzo:** S
- **Cómo verificarlo:** `curl -I https://www.cervantes-smart-learning.com.ar/login` muestra los headers, y un `<iframe src=…/director>` desde otro origen no carga.

---

### DEV-008 · SCRUM-123 (puerto de `DATABASE_URL` en preview) **persiste** sin verificar, y la conexión a Postgres no valida el certificado TLS

- **Tipo:** Infra · **Severidad:** Media (SCRUM-123) / Baja (TLS)
- **Archivo:línea:** `src/lib/drizzle/index.ts:5-11`; `scripts/seed-e2e.ts` (mismo `ssl`); variables de Vercel Preview
- **Descripción y cómo se dispara:**
  - Local usa el pooler en **modo transacción (6543)** con `prepare: false`, que es lo correcto para serverless. Según SCRUM-123, Preview usa **5432**, el pooler en modo sesión: cada función serverless retiene una conexión de sesión mientras vive, y con varias lambdas concurrentes se agota el `pool_size` del plan free (`max clients reached`). No pude verificar las variables de Vercel porque el conector de Vercel no está autorizado en esta sesión, así que el ticket queda **abierto**.
  - Hay una confusión de fondo: A-01 de `hallazgos.md` dice que el DDL tiene que ir por 5432. Las dos cosas son ciertas, pero son **dos URLs distintas**.
  - `ssl: { rejectUnauthorized: false }` acepta cualquier certificado: es vulnerable a MITM entre Vercel y el pooler.
- **Fix propuesto:**
  ```diff
  // drizzle.config.ts — migraciones por el pooler de sesión
  -    url: process.env.DATABASE_URL!,
  +    url: process.env.DATABASE_URL_MIGRATIONS ?? process.env.DATABASE_URL!, // :5432
  ```
  - Runtime: `DATABASE_URL` siempre en `:6543` en Production y Preview.
  - TLS: `ssl: { ca: process.env.SUPABASE_DB_CA }` con el certificado que se descarga del dashboard, o `ssl: "require"` + `sslmode=verify-full`.
- **Esfuerzo:** S
- **Cómo verificarlo:** `vercel env ls` muestra `:6543` en Preview y Production. Un deploy de preview carga `/director` con 10 pestañas concurrentes sin `max clients`.

---

### DEV-009 · El reset de contraseña y los links de invitación se arman con headers del request (`Origin`, `X-Forwarded-Host`)

- **Tipo:** Seguridad · **Severidad:** Baja
- **Archivo:línea:** `src/modules/auth/actions.ts:124`; `src/app/(auth)/invite/[encoded]/page.tsx:14-17`; `src/modules/{students,teachers,users}/actions.ts` (cálculo de `siteUrl`)
- **Descripción y cómo se dispara:** `forgotPasswordAction` usa `headers().get("origin")` como base del `redirectTo`. Supabase lo contrasta con su lista de Redirect URLs. Si esa lista tiene comodines (`*`, `**`), un atacante puede pedir el reset de una víctima con `Origin: https://evil.tld`, y el link del email llevaría los tokens a su dominio. En las invitaciones, `x-forwarded-host` en Vercel lo fija la plataforma, pero en otros entornos es inyectable. A esto se suma que no hay rate limiting en `forgotPasswordAction`: se puede usar para mandar emails masivos con el remitente de la institución, con costo de Resend.
- **Fix propuesto:** usar siempre `process.env.NEXT_PUBLIC_SITE_URL` (que ya existe en `.env.local`) y revisar que las Redirect URLs de Supabase no tengan comodines. Para el rate limiting, un contador por email/IP (tabla o Upstash), por ejemplo 3 por hora.
- **Esfuerzo:** S
- **Cómo verificarlo:** POST a `forgotPasswordAction` con `Origin: https://evil.tld`: el link del email tiene que apuntar al dominio real.

---

### DEV-010 · IDOR en notas: un profesor crea, edita o borra notas de **cualquier** alumno o curso

- **Tipo:** Seguridad · **Severidad:** Alta
- **Archivo:línea:**
  - `src/modules/grades/actions.ts:44` + `:66-76` (create)
  - `:89` + `:117` (update)
  - `:129` + `:135` (delete)
- **Descripción y cómo se dispara:** las tres actions hacen `requireRole(["director","profesor"])` y después escriben con `createServiceClient()` (bypassea RLS) usando el `enrollmentId` o el `id` que llega del form. Nunca verifican que la inscripción sea de un curso del docente. Los UUID ajenos se consiguen fácil por DEV-003. Un profesor manda la Server Action con el `enrollmentId` de otro curso, o con el `id` de una nota ajena, y la escritura pasa.
- **Impacto:** adulteración de notas, que alimentan la promoción y el cierre de ciclo. Cada cambio dispara además un email "Nota publicada" al alumno.
- **Fix propuesto:** helper común `src/lib/auth/ownership.ts`:
  ```ts
  export async function assertCanWriteEnrollment(role: UserRole, profileId: string, enrollmentId: string) {
    if (role === "director") return true;
    const [row] = await db.select({ id: enrollments.id }).from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .innerJoin(teachers, eq(teachers.id, courses.teacherId))
      .where(and(eq(enrollments.id, enrollmentId), eq(teachers.profileId, profileId)))
      .limit(1);
    return !!row;
  }
  ```
  Usarlo en create. En update y delete, resolver primero el `enrollmentId` a partir de `grades.id`. Devolver `{ error: "No autorizado" }`, no lanzar.
- **Esfuerzo:** M (el helper sirve también para DEV-011 y DEV-015)
- **Cómo verificarlo:** logueado como profesor A, invocar `createGradeAction` con un enrollment de un curso del profesor B. Hoy se inserta; después del fix tiene que devolver error.

---

### DEV-011 · IDOR en asistencia: un profesor toma, corrige o borra la lista de cualquier curso y puede mezclar alumnos de otros cursos

- **Tipo:** Seguridad · **Severidad:** Alta
- **Archivo:línea:**
  - Actions con solo chequeo de rol: `src/modules/attendance/actions.ts:13` (record), `:120` (update) y `:154` (delete).
  - El chequeo de propiedad existe solo en la página `src/app/(dashboard)/profesor/attendance/new/page.tsx:34-35`.
  - En record, los `enrollmentIds` no se filtran por `courseId`: `actions.ts:126-142`.
- **Descripción y cómo se dispara:** se llama a la action directamente, sin pasar por la página. `recordAttendanceAction` inserta todos los `enrollmentIds` que recibe aunque no pertenezcan al `courseId` (`updateAttendanceSession` sí filtra; record no). `deleteAttendanceSession` borra la sesión de cualquier curso.
- **Impacto:** ausencias falsas que bajan el % de promoción y disparan emails de ausencia, alertas y el diagnóstico IA.
- **Fix propuesto:**
  - Si el rol es `profesor`, verificar `courses.teacher_id = teacher(profile).id` en las tres actions.
  - En record, filtrar los enrollmentIds:
    ```ts
    const valid = await db.select({ id: enrollments.id }).from(enrollments)
      .where(and(eq(enrollments.courseId, courseId), eq(enrollments.status, "active"), inArray(enrollments.id, enrollmentIds)));
    ```
- **Esfuerzo:** M
- **Cómo verificarlo:** POST con un `courseId` propio y un `enrollmentId` de otro curso. Hoy se registra; con el fix se ignora o devuelve error.

---

### DEV-012 · Encuesta docente: el alumno puede votar en cursos donde no está inscripto, votar infinitas veces y bloquear la encuesta de otro alumno

- **Tipo:** Seguridad · **Severidad:** Alta
- **Archivo:línea:**
  - `src/modules/teacher-evaluations/actions.ts:14-15` (el chequeo de duplicado solo corre si viene `enrollmentId`) y `:43`.
  - `src/app/(dashboard)/alumno/evaluations/[courseId]/page.tsx:30,64`.
  - `teacher_surveys` no tiene índice único: lo verifiqué en `pg_indexes`.
- **Descripción y cómo se dispara:**
  - El alumno abre `/alumno/evaluations/<cualquier courseId>` sin `?enrollment=`. El form manda `enrollmentId=""`, se saltea `hasSurveySubmitted` y se inserta igual.
  - `teacherId` y `courseId` salen del form y no se cruzan con las inscripciones del alumno.
  - Si se manda el `enrollmentId` de otro alumno, se le "consume" la encuesta a ese otro alumno.
- **Impacto:** cualquier alumno puede inflar o hundir el promedio de un docente. Las métricas de evaluación docente, que usa la dirección, dejan de ser confiables.
- **Fix propuesto:** `enrollmentId` obligatorio. `teacherId` y `courseId` se derivan del servidor y se valida que la inscripción sea del alumno:
  ```ts
  const student = await getStudentByProfileId(profile.id);
  const [enr] = await db.select({ courseId: enrollments.courseId, teacherId: courses.teacherId })
    .from(enrollments).innerJoin(courses, eq(courses.id, enrollments.courseId))
    .where(and(eq(enrollments.id, enrollmentId), eq(enrollments.studentId, student.id)));
  if (!enr) return { error: "No autorizado" };
  ```
  Migración: `CREATE UNIQUE INDEX teacher_surveys_enrollment_unique ON teacher_surveys(enrollment_id);` y mapear `isUniqueViolation` → "Ya enviaste tu evaluación". Ojo con el anonimato (DEV-003): el `enrollment_id` no debe ser legible fuera del servidor.
- **Esfuerzo:** M
- **Cómo verificarlo:** POST con un `courseId` ajeno y sin enrollment tiene que dar error, y un segundo envío tiene que responder "Ya enviaste…".

---

### DEV-013 · Autoevaluaciones: el alumno responde evaluaciones de cursos ajenos, tiene intentos ilimitados, y los duplicados rompen la página de resultado

- **Tipo:** Seguridad / Bug · **Severidad:** Alta
- **Archivo:línea:**
  - `src/modules/assessments/actions.ts:350` + `:378-381` (solo chequea `status === "published"`).
  - `src/app/(dashboard)/alumno/assessments/[id]/page.tsx:18-45`.
  - `src/modules/assessments/services/assessments.service.ts:266` (insert sin chequeo).
  - `src/lib/drizzle/schema.ts:334-345` (sin `UNIQUE(assessment_id, student_id)`).
  - `alumno/assessments/[id]/resultado/page.tsx:110-117` (`.single()`).
- **Descripción y cómo se dispara:**
  - Cualquier evaluación publicada es visible y respondible por id, sin verificar que el alumno esté inscripto en el curso.
  - La action no chequea si ya hay un intento (solo la página redirige). Un re-POST o un doble click genera varios intentos.
  - Con más de un intento, `.single()` falla y `/resultado` da 404, y el `avgScore` que ve el docente queda distorsionado.
  - `answers` no se valida contra `questions.length` ni contra `options.length`.
- **Impacto:** las métricas de las autoevaluaciones no son confiables y hay alumnos que ven errores.
- **Fix propuesto:** en `submitAttemptAction`:
  - verificar la inscripción activa en `assessment.courseId`;
  - verificar `answers.length === questions.length` y cada `0 <= a < options.length`;
  - insertar con `onConflictDoNothing()`.
  Migración: `CREATE UNIQUE INDEX assessment_attempts_unique ON assessment_attempts(assessment_id, student_id);`.
- **Esfuerzo:** M
- **Cómo verificarlo:** enviar dos veces el mismo intento: tiene que quedar 1 fila y `/resultado` tiene que cargar. Un alumno de otro curso tiene que recibir "No autorizado".

---

### DEV-014 · Las respuestas correctas de la autoevaluación viajan al navegador antes de que el alumno responda

- **Tipo:** Seguridad · **Severidad:** Media
- **Archivo:línea:** `src/app/(dashboard)/alumno/assessments/[id]/page.tsx:48-54` pasa `questions` completo (con `correct` y `explanation`) al client component `QuizPlayer`; `QuizPlayer.tsx:28,100,125` usa `q.correct` para el feedback inmediato
- **Descripción y cómo se dispara:** las respuestas aparecen en el payload RSC: alcanza con mirar la pestaña Network o el source y buscar `"correct"`. Además se pueden leer por la API de Supabase (DEV-003).
- **Impacto:** la autoevaluación pierde valor y el score que ve el docente no refleja el nivel real.
- **Fix propuesto:** mandar al cliente solo `{ question, options }`. El feedback por pregunta se resuelve con una action `checkAnswer(assessmentId, index, answer)` que devuelva `{ correct, explanation }`, o se muestra recién en `/resultado`.
- **Esfuerzo:** M
- **Cómo verificarlo:** el HTML/RSC de `/alumno/assessments/[id]` no contiene `"correct"`.

---

### DEV-015 · El profesor publica, archiva y ve cualquier autoevaluación, y genera evaluaciones IA para cursos ajenos

- **Tipo:** Seguridad · **Severidad:** Media
- **Archivo:línea:**
  - `src/modules/assessments/actions.ts:218-297` (generate, sin validar el `courseId`).
  - `:304-325` (publish: reenvía emails a todo el curso y se puede re-publicar una archivada).
  - `:337-342` (archive).
  - `src/app/(dashboard)/profesor/assessments/[id]/page.tsx:146-147` (muestra cualquier evaluación, con las respuestas).
- **Descripción y cómo se dispara:** las actions solo verifican el rol. Un profesor manda el id de una evaluación o de un curso que no es suyo.
- **Impacto:** emails masivos a alumnos de otros cursos, evaluaciones de otro docente archivadas y costo de IA cargado a otro curso.
- **Fix propuesto:** helper de propiedad por `assessment.courseId` (el mismo de DEV-010). Permitir publicar solo desde `draft`, con `UPDATE … WHERE status='draft'`.
- **Esfuerzo:** S-M
- **Cómo verificarlo:** como profesor A, `publishAssessmentAction` con una evaluación de B tiene que devolver error.

---

### DEV-016 · Generación con IA: sin cuota, sin validar el JSON del modelo, sin timeout, y bloquea la toma de asistencia

- **Tipo:** Rendimiento / Bug · **Severidad:** Media
- **Archivo:línea:**
  - `src/modules/assessments/actions.ts:36-78` (baja los PDF completos y los manda en base64, sin tope de cantidad), `:148`, `:153-160`, `:280`, `:285-292`.
  - `src/modules/assessments/services/auto-assessment.service.ts:371-419`.
  - `src/modules/attendance/actions.ts:207` (`await checkAndTriggerDiagnosticAssessment`).
- **Descripción y cómo se dispara:**
  - No hay rate limit ni tope de documentos: `documentIds` no tiene `max`, cada PDF puede pesar hasta 10 MB y los ids no se validan como UUID.
  - La respuesta del modelo se parsea con un regex greedy y `JSON.parse` + cast. No se valida `options.length === 4`, `0 <= correct <= 3` ni `stop_reason === "max_tokens"` (con `max_tokens: 2048` y 10 preguntas el JSON puede quedar truncado).
  - La evaluación de diagnóstico se **publica sin revisión** y se genera con `await` **dentro** de `recordAttendanceAction`: el docente espera la llamada a Claude más los emails secuenciales.
  - El cliente Anthropic usa los defaults (timeout de 10 min, 2 reintentos).
  - El modelo `claude-haiku-4-5-20251001` está hardcodeado 3 veces.
- **Impacto:** costo de API sin control, evaluaciones rotas publicadas (un `options` inválido rompe `QuizPlayer`) y la toma de asistencia tarda segundos o minutos.
- **Fix propuesto:**
  ```ts
  const QuestionsSchema = z.array(z.object({
    question: z.string().min(1), options: z.array(z.string()).length(4),
    correct: z.number().int().min(0).max(3), explanation: z.string(),
  })).length(10);
  const anthropic = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  export const ASSESSMENT_MODEL = "claude-haiku-4-5-20251001"; // una sola constante
  ```
  - `z.array(z.uuid()).max(3)` para `documentIds`.
  - Cuota diaria por `createdBy`.
  - El diagnóstico con `after()` de `next/server`, para que corra después de la respuesta.
- **Esfuerzo:** M
- **Cómo verificarlo:** test unitario del parser con un JSON truncado: tiene que devolver error, no publicar. Tomar asistencia en la clase N (la que dispara el diagnóstico) tiene que responder en menos de 1 s.

---

### DEV-017 · Editar alumno o docente no guarda nombre ni teléfono (éxito falso) — **persiste** (SCRUM-242)

- **Tipo:** Bug · **Severidad:** Alta
- **Archivo:línea:** `src/modules/students/services/students.service.ts:128-138`; `src/modules/teachers/services/teachers.service.ts:78-85`
- **Descripción y cómo se dispara:** `updateStudent`/`updateTeacher` hacen `.set({ ...data })` sobre `students`/`teachers`, pero `fullName` y `phone` son columnas de `profiles`. Drizzle descarta las claves que no son columnas de la tabla (`buildUpdateSet`), y la action responde "Alumno actualizado".
- **Impacto:** los datos de contacto no se pueden corregir y el usuario cree que sí se guardaron.
- **Fix propuesto:**
  ```ts
  export async function updateStudent({ id, fullName, phone, ...data }: UpdateStudentInput) {
    return db.transaction(async (tx) => {
      const [s] = await tx.update(students).set({ ...data, updatedAt: new Date() })
        .where(eq(students.id, id)).returning();
      if (s && (fullName !== undefined || phone !== undefined))
        await tx.update(profiles).set({ fullName, phone: phone ?? null, updatedAt: new Date() })
          .where(eq(profiles.id, s.profileId));
      return s;
    });
  }
  ```
  Ídem para teachers. Agregar `updateTag("students"/"teachers")` en la action.
- **Esfuerzo:** S
- **Cómo verificarlo:** editar el nombre de un alumno → el detalle y el listado muestran el nombre nuevo.

---

### DEV-018 · El puntaje del test de nivel nunca se guarda — **persiste** (SCRUM-243)

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:** `src/modules/students/actions.ts:16-23` (create) y `:104-112` (update). Ninguno de los dos `raw` lee `placementTestScore`, aunque `StudentForm.tsx:131` lo registra.
- **Fix propuesto:** agregar `placementTestScore: (formData.get("placementTestScore") as string) || undefined` en los dos `raw`, con `z.coerce.number().min(0).max(100).optional()` en el schema.
- **Esfuerzo:** S
- **Cómo verificarlo:** crear un alumno con puntaje 65 → el detalle muestra 65.

---

### DEV-019 · Borrar un alumno borra en cascada sus pagos y deja su cuenta habilitada

- **Tipo:** Bug (integridad de datos) · **Severidad:** Alta
- **Archivo:línea:** `src/modules/students/services/students.service.ts:141-143`; `src/lib/drizzle/schema.ts:266` (`payments.studentId … onDelete: "cascade"`) y `:218` (enrollments → attendance/grades); `src/modules/teachers/services/teachers.service.ts:88-90`
- **Descripción y cómo se dispara:** `deleteStudentAction` está disponible también para el administrativo. Hace `DELETE FROM students`, que cascadea **pagos**, inscripciones, asistencias y notas. Esto contradice la decisión D-02 de `hallazgos.md`: los pagos se anulan, nunca se borran. `profiles` y `auth.users` quedan intactos, así que el ex-alumno sigue pudiendo loguearse en `/alumno` y ve una cuenta vacía. Con los docentes pasa lo mismo.
- **Impacto:** se pierde la trazabilidad contable de forma irreversible y quedan cuentas huérfanas activas.
- **Fix propuesto:**
  - Baja lógica: `status = 'inactive'` + `banUser(profileId)`.
  - Borrado físico solo para director y solo sin pagos. Hacer `admin.auth.admin.deleteUser(profileId)`, que cascadea a profiles.
  - Migración: `payments.student_id … ON DELETE RESTRICT`.
- **Esfuerzo:** M
- **Cómo verificarlo:** borrar un alumno con pagos. Hoy los pagos desaparecen; con el fix, la baja es lógica, los pagos siguen y el login es rechazado.

---

### DEV-020 · Reactivar una inscripción saltea cupo y horario, y el duplicado termina en pantalla de error — **persiste** (SCRUM-244)

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:** `src/modules/enrollments/services/enrollments.service.ts:247-254`; `src/modules/enrollments/actions.ts:99`
- **Descripción y cómo se dispara:** `updateEnrollment` pone `status: "active"` sin la transacción `FOR UPDATE` que usa el alta: no cuenta cupo ni verifica superposición horaria. Reactivar una baja en un curso lleno deja 16/15. Si ya hay otra inscripción activa igual, el índice parcial `enrollments_student_course_active_unique` lanza 23505 sin capturar. Además, pasar a `completed` no setea `completedAt`.
- **Fix propuesto:** si el estado nuevo es `active`, reusar la lógica transaccional de `validateAndCreateEnrollment` (`FOR UPDATE` del curso + conteo + horario) y mapear `isUniqueViolation`. Setear `completedAt` cuando corresponde.
- **Esfuerzo:** M
- **Cómo verificarlo:** con un curso de 15 activos, reactivar una baja tiene que devolver "Cupo completo".

---

### DEV-021 · Al crear una inscripción no se valida el estado del alumno ni del curso

- **Tipo:** Bug · **Severidad:** Baja
- **Archivo:línea:** `src/modules/enrollments/services/enrollments.service.ts:174-226` (el filtro existe solo en la UI: `enrollments/new/page.tsx:58`)
- **Descripción:** por POST directo se puede inscribir a un alumno `suspended`/`graduated` en un curso `inactive`/`completed`.
- **Fix propuesto:** dentro de la transacción, `if (course.status !== "active" || student.status !== "active") return { error }`.
- **Esfuerzo:** S · **Cómo verificarlo:** POST con un `courseId` de un curso inactivo tiene que devolver error.

---

### DEV-022 · `requireRole` **lanza** una excepción, no hay ningún `error.tsx`, y la UI del administrativo ofrece acciones que son solo de director

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:**
  - `src/lib/auth/helpers.ts:44-50`. No existe `src/app/**/error.tsx` ni `global-error.tsx`.
  - "Reenviar invitación" en `administrativo/students/[id]/page.tsx:89-90` usa `resendInvitationAction`, que es solo director (`users/actions.ts:136`).
  - `GradeList.tsx:66,117` linkea siempre a `/director/grades/[id]`, que el proxy no bloquea. Ahí el administrativo ve el form, pero `update/deleteGradeAction` son `["director","profesor"]`.
  - `/director/documents` + `deleteDocumentAction`, que es solo director.
- **Descripción y cómo se dispara:** el administrativo hace click → la action lanza "No autorizado" → aparece la pantalla de error genérica de Next, sin toast. Lo mismo pasa con cualquier sesión vencida en medio de un formulario.
- **Impacto:** mala experiencia, errores que parecen caídas y ruido en los reportes de QA.
- **Fix propuesto:**
  ```ts
  // helpers.ts
  export async function checkRole(allowed: UserRole[]): Promise<{ role: UserRole } | { error: string }> {
    const profile = await getServerProfile();
    const role = profile?.role as UserRole | undefined;
    return role && allowed.includes(role) ? { role } : { error: "No tenés permisos para esta acción" };
  }
  // en las actions con ActionResult:
  const auth = await checkRole(["director", "administrativo"]); if ("error" in auth) return auth;
  ```
  - Agregar `src/app/(dashboard)/error.tsx` (client component con botón "Reintentar").
  - Decidir con el PO si el administrativo reenvía invitaciones. Si sí, sumar el rol y validar que el email sea de un alumno.
  - Parametrizar el `basePath` de `GradeList`.
- **Esfuerzo:** S-M
- **Cómo verificarlo:** como administrativo, "Reenviar invitación" muestra un toast (de éxito o de error), no la pantalla de error.

---

### DEV-023 · `updateUserAction`: cambiar el rol deja `user_metadata` desincronizado, no crea la ficha y permite que el director se degrade o banee a sí mismo

- **Tipo:** Bug / Seguridad · **Severidad:** Media
- **Archivo:línea:** `src/modules/users/services/users.service.ts:64-76`; `src/modules/users/actions.ts:90-133`
- **Descripción y cómo se dispara:**
  - Solo actualiza `profiles.role`. El proxy usa `user_metadata.role` (DEV-004), así que un director degradado a administrativo conserva el acceso a `/director/users`, y uno promovido recibe 403.
  - Pasar un usuario a `alumno`/`profesor` no crea la fila en `students`/`teachers`, y el portal queda roto.
  - No hay chequeo `id !== self`: el único director puede degradarse o banearse y el sistema queda sin director.
  - `banUser`/`unbanUser` ignoran el `{ error }` de Supabase y redirigen como si hubiera funcionado.
- **Fix propuesto:**
  - `admin.auth.admin.updateUserById(id, { app_metadata: { role } })` (o eliminar el uso de metadata, ver DEV-004).
  - Restringir los cambios de rol a director ↔ administrativo.
  - Rechazar el auto-cambio y el auto-ban.
  - Chequear `error`.
- **Esfuerzo:** S-M · **Cómo verificarlo:** el director intenta degradarse → error. Promover a administrativo → ese usuario es bloqueado en `/director/users`.

---

### DEV-024 · Los reportes Excel devuelven 403 al administrativo aunque su portal los ofrece — **persiste** (SCRUM-245)

- **Tipo:** Bug · **Severidad:** Alta
- **Archivo:línea:** `src/app/api/reports/attendance/route.ts:12`, `grades/route.ts:20`, `payments/route.ts:25` (`profile?.role !== "director"`); links en `src/app/(dashboard)/administrativo/reports/page.tsx:57,70,84`
- **Fix propuesto:** helper compartido `requireApiRole(["director","administrativo"])` que devuelva 403. Si la decisión I-08 de `hallazgos.md` es que el administrativo no los use, quitar los links.
- **Esfuerzo:** S · **Cómo verificarlo:** el test `tests/e2e/administrativo/reports.spec.ts` (hoy `test.fail`) pasa.

---

### DEV-025 · Ningún proceso automático pasa los pagos vencidos a `overdue`: las alertas de mora, la restricción de acceso y el riesgo dependen de que alguien apriete un botón

- **Tipo:** Bug · **Severidad:** Alta
- **Archivo:línea:** `src/modules/payments/services/payments.service.ts:175` (`markOverduePayments`) se invoca solo desde `src/modules/payments/actions.ts:177,186` (botones de las páginas de pagos). Ningún cron de `vercel.json` la llama. Los que dependen de `status='overdue'` son `cron.service.ts:204`, `api/cron/overdue-alert/route.ts:46` y `risk-detection.service.ts:43`.
- **Impacto:** si nadie entra a Pagos y aprieta "Marcar vencidos", no salen alertas de mora, no se restringe a nadie por 2+ cuotas y la detección de riesgo no ve la mora. La regla de negocio del vencimiento el día 10 no se aplica sola.
- **Fix propuesto:**
  ```diff
   // src/app/api/cron/overdue-alert/route.ts
  +  await markOverduePayments();
     const recipients = await getOverdueAlertRecipients();
  ```
  Hacer lo mismo al inicio de `runRiskDetection()`.
- **Esfuerzo:** S · **Cómo verificarlo:** con un pago `pending` y `due_date` en el pasado, `GET /api/cron/overdue-alert` (con el secret) lo pasa a `overdue` y manda la alerta.

---

### DEV-026 · Una sola columna `overdue_alert_sent_at` para dos alertas distintas: la que corre primero anula a la otra

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:**
  - La setean el cron (`api/cron/overdue-alert/route.ts:31-34`) y `automations/actions.ts:70` cuando avisan al **alumno**.
  - La setea `payments.service.ts:211,218` (`runOverdueChecksAction`) cuando avisa a **dirección** a los 15 días.
  - Los dos flujos filtran por `isNull(overdueAlertSentAt)`.
- **Impacto:** si el cron diario corre primero, dirección nunca recibe la alerta de 15 días. Si se usa primero el botón, el alumno nunca recibe su email.
- **Fix propuesto:** migración que agregue `payments.director_alert_sent_at timestamptz` y usarla en el flujo de dirección.
- **Esfuerzo:** S-M · **Cómo verificarlo:** un pago vencido hace 20 días genera las dos alertas.

---

### DEV-027 · Los errores de envío de email no se detectan: las alertas se marcan como enviadas aunque fallen, y la UI informa éxito

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:**
  - `src/lib/email.ts` (todas las funciones; por ejemplo `:57`, `:326`, `:375`, `:582`): hacen `await resend.emails.send(...)` sin leer `{ error }`. Resend v6 no lanza excepción ante 4xx/429.
  - `.catch(() => {})` en `students/actions.ts:93`, `teachers/actions.ts:92` y `users/actions.ts:84,157`.
- **Impacto:**
  - `overdue-alert` marca `overdueAlertSentAt` aunque el email no haya salido, y ese alumno no vuelve a ser avisado.
  - "Invitación reenviada" aparece aunque Resend la haya rechazado.
  - Los contadores `failed` de los crons siempre dan 0.
- **Fix propuesto:**
  ```ts
  async function send(payload: CreateEmailOptions) {
    const { data, error } = await resend.emails.send(payload);
    if (error) throw new Error(`Resend: ${error.name} ${error.message}`);
    return data;
  }
  ```
  En las invitaciones, devolver `{ success: "Alumno creado, pero no se pudo enviar la invitación: reenviala desde el detalle" }`.
- **Esfuerzo:** S · **Cómo verificarlo:** con `RESEND_API_KEY` inválida, el cron reporta `failed > 0` y `overdue_alert_sent_at` queda en null.

---

### DEV-028 · Crons: si falta `CRON_SECRET`, el header `Authorization: Bearer undefined` pasa la validación

- **Tipo:** Seguridad · **Severidad:** Media (Alta si la variable no está cargada en Production)
- **Archivo:línea:** `src/app/api/cron/{class-reminder,daily-report,payment-reminder,risk-detection}/route.ts:8` y `overdue-alert/route.ts:11` (`authHeader !== \`Bearer ${process.env.CRON_SECRET}\``). El bypass en `development` ya estaba registrado como E-04.
- **Descripción y cómo se dispara:** si `CRON_SECRET` es undefined, el string esperado es `"Bearer undefined"`, y cualquiera puede disparar envíos masivos de emails o restricciones de acceso. La comparación además no es de tiempo constante. `CRON_SECRET` **no figura** en `.env.local.example`, así que es fácil que falte.
- **Fix propuesto:**
  ```ts
  // src/lib/cron-auth.ts
  export function assertCron(req: NextRequest): NextResponse | null {
    const secret = process.env.CRON_SECRET;
    if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    const got = Buffer.from(req.headers.get("authorization") ?? "");
    const exp = Buffer.from(`Bearer ${secret}`);
    return got.length === exp.length && timingSafeEqual(got, exp) ? null
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
  Documentar `CRON_SECRET` en `.env.local.example`.
- **Esfuerzo:** S · **Cómo verificarlo:** en un preview sin la variable, `curl -H "Authorization: Bearer undefined" …/api/cron/daily-report` responde 500, no 200.

---

### DEV-029 · Los pagos `suspended` (más de 30 días de mora) no se pueden cobrar y desaparecen de la deuda informada

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:**
  - `payments.service.ts:250` los suspende.
  - `director/payments/[id]/page.tsx:42,123,145` (y la copia de administrativo): `isPendingOrOverdue` oculta `MarkAsPaidForm`, `PaymentEditForm` y `PaymentStatusForm`.
  - Los totales excluyen `suspended` en `alumno/payments/page.tsx:40`, `payments.service.ts:263` y `reports.service.ts:89-91`.
- **Impacto:** no se puede registrar el cobro de la deuda más vieja (justo la que más importa) y los reportes subestiman la morosidad.
- **Fix propuesto:** tratar `suspended` como cobrable: `["pending","overdue","suspended"]` en los forms, en `markAsPaid` y en los totales.
- **Esfuerzo:** S · **Cómo verificarlo:** suspender un pago (con `runOverdueChecks`) y marcarlo como pagado desde la UI.

---

### DEV-030 · `markAsPaid` y `updatePaymentStatus` no validan el estado actual: se puede cobrar un pago anulado o cobrar dos veces

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:** `src/modules/payments/services/payments.service.ts:120` y `:170` (`where(eq(payments.id, id))` sin filtro de estado); `src/modules/payments/schemas.ts:29` acepta `"paid"`
- **Descripción y cómo se dispara:** desde una pestaña vieja o con un POST armado se puede pasar a `paid` un pago anulado, o volver a pagarlo pisando `paidAt` y el recibo. Con `updatePaymentStatusAction` se puede poner `paid` sin `method` ni `paidAt`, o devolver a `pending` un pago cobrado.
- **Fix propuesto:**
  ```ts
  const [row] = await db.update(payments).set({...})
    .where(and(eq(payments.id, input.id), inArray(payments.status, ["pending","overdue","suspended"])))
    .returning({ id: payments.id });
  if (!row) return { error: "El pago ya no está pendiente" };
  ```
  Schema de estado: `z.enum(["pending","overdue","suspended"])`.
- **Esfuerzo:** S · **Cómo verificarlo:** `markAsPaidAction` sobre un pago anulado devuelve error.

---

### DEV-031 · La restricción de acceso por mora no se levanta al pagar, y las actions del alumno restringido siguen funcionando

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:**
  - Se activa en `api/cron/overdue-alert/route.ts:43-65` y `automations/actions.ts:78-100` (loop N+1).
  - Solo se desactiva a mano (`toggleAccessRestrictedAction`).
  - El bloqueo vive únicamente en `src/app/(dashboard)/alumno/layout.tsx:13`.
- **Impacto:** el alumno que regulariza sigue bloqueado hasta que alguien de dirección lo note. Esto toca la pregunta I-06 de `hallazgos.md`, que hay que resolver con el cliente. Mientras está "restringido", igual puede invocar actions como la encuesta o los reclamos, porque los layouts no protegen las Server Actions.
- **Fix propuesto:** después de `markAsPaid`/`cancelPayment`, recalcular: si quedan menos de 2 vencidos, `accessRestricted = false` (según lo que decida I-06). Un `UPDATE … WHERE id IN (SELECT student_id … HAVING count(*) >= 2)` único reemplaza el loop.
- **Esfuerzo:** S-M · **Cómo verificarlo:** alumno con 2 vencidos restringido → se registra el pago de uno → al siguiente request entra al portal.

---

### DEV-032 · Fechas "de hoy" calculadas en UTC: desde las 21:00 hora Argentina el sistema ya vive en el día siguiente

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:**
  - Pagos: `src/modules/payments/services/payments.service.ts:7` (`today()` con `toISOString()`, que define qué está vencido) y `:262` (`current_date`).
  - Páginas de pagos: `director/payments/[id]/page.tsx:35`, `alumno/payments/page.tsx:28`, `PaymentForm.tsx:24-28`.
  - Asistencia: `profesor|director|administrativo/attendance/new/page.tsx` (`new Date().toISOString().split("T")[0]`).
  - Reporte diario: `daily-report.service.ts:24,88` (`::date` en UTC).
  - Fechas mostradas: `toLocaleDateString` sin `timeZone` en `receipt/page.tsx:44`, `api/reports/payments/route.ts:35`, `grades/route.ts:31`, `resultado/page.tsx:160-166`, `certificate/page.tsx:45-50`.
  - Formulario de alumno: `StudentForm.tsx:34-37`.
- **Descripción y cómo se dispara:**
  - Un pago que vence el 10 figura vencido desde las 21:00 del 10, y `markOverduePayments` lo marca `overdue` en ese momento.
  - La asistencia de una clase nocturna propone la fecha de mañana, lo que también afecta la detección de "2 faltas seguidas".
  - Un pago cobrado a las 22:00 sale con fecha del día siguiente en el recibo y en el Excel.
- **Impacto:** alumnos marcados en mora antes de tiempo (con emails y restricciones), asistencias con fecha errónea y recibos con fecha equivocada.
- **Fix propuesto:**
  ```ts
  // src/lib/dates.ts
  export const AR_TZ = "America/Argentina/Cordoba";
  export const todayAR = () => new Intl.DateTimeFormat("en-CA", { timeZone: AR_TZ }).format(new Date()); // YYYY-MM-DD
  export const fmtDateAR = (d: Date | string) => new Date(d).toLocaleDateString("es-AR", { timeZone: AR_TZ });
  ```
  En SQL: `(paid_at AT TIME ZONE 'America/Argentina/Cordoba')::date` y `(now() AT TIME ZONE 'America/Argentina/Cordoba')::date` en lugar de `current_date`. Reemplazar todos los usos listados.
- **Esfuerzo:** M
- **Cómo verificarlo:** test unitario con `vi.setSystemTime(new Date("2026-10-11T01:30:00Z"))` (22:30 ART del 10): `todayAR()` devuelve `"2026-10-10"`, y un pago que vence el 10 **no** está vencido.

---

### DEV-033 · Las pantallas de Promociones, Cierre de ciclo, Reportes y el dashboard calculan con PostgREST, que corta en 1000 filas, y no coinciden con lo que se consolida

- **Tipo:** Bug · **Severidad:** Alta
- **Archivo:línea:**
  - `src/app/(dashboard)/director/promotions/page.tsx:32-35`.
  - `director/year-end/page.tsx:38-41`.
  - `director/reports/page.tsx:32-36`.
  - `administrativo/reports/page.tsx:7-11`.
  - `director/page.tsx:54-58`.
  - Además redefinen `ATTENDANCE_THRESHOLD`/`GRADE_THRESHOLD` localmente (`promotions/page.tsx:6-7`, `year-end/page.tsx:6-7`).
- **Descripción y cómo se dispara:** las páginas traen tablas enteras (`attendance`, `grades`, `payments`) con el cliente Supabase y calculan los promedios en JS. PostgREST devuelve como máximo `max_rows` (1000 por default) **sin avisar**. Con 3 cursos × 15 alumnos × 25 clases ya se pasa de 1000 asistencias. Además, `.in("enrollment_id", ids)` con muchos ids arma una URL enorme (riesgo de 414). En cambio, `consolidateYearEnd` usa `getYearEndReport()` (SQL agregado, correcto).
- **Impacto:** el director ve "Apto/No apto" calculado con datos parciales, distinto de lo que efectivamente se consolida. Una decisión académica se toma con números erróneos, y es justo el tipo de pregunta que puede salir en el coloquio.
- **Fix propuesto:** que las páginas usen los servicios SQL que ya existen y hoy no tienen uso: `getPromotionEligibility()`, `getYearEndReport()` y `getReportsSummary()`. Exportar los umbrales desde `promotions.service.ts` y borrar las copias locales.
- **Esfuerzo:** S
- **Cómo verificarlo:** con más de 1000 registros de asistencia en el seed, el % que muestra la página coincide con `select … count(*) filter (where status in ('present','late'))`.

---

### DEV-034 · El redondeo permite promover con 79,5% de asistencia o 6,95 de promedio

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:** `src/modules/promotions/services/promotions.service.ts:72` (`round(avg,1) >= 7`) y `:103,106` (`Math.round(present/total*100) >= 80`); la misma lógica en `year-end.service.ts:219-276` y en las páginas de DEV-033
- **Descripción:** 35/44 = 79,55% → se redondea a 80 → apto. Un promedio de 6,95 → se redondea a 7,0 → apto. Además, `late` cuenta como presente en todos lados y eso no está documentado como regla. Hay que confirmarlo con el BA, y también si el umbral es 80% o 70% (B-01 de `hallazgos.md`).
- **Fix propuesto:** comparar sin redondear (`present * 100 >= ATTENDANCE_THRESHOLD * total`, `avg >= GRADE_THRESHOLD`) y redondear solo para mostrar.
- **Esfuerzo:** S · **Cómo verificarlo:** test unitario: 35/44 → no apto; notas [7, 6.9] → no apto.

---

### DEV-035 · El cierre de ciclo no es transaccional ni idempotente

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:** `src/modules/year-end/services/year-end.service.ts:312-358`; `src/modules/year-end/actions.ts:167-176`
- **Descripción y cómo se dispara:**
  - Primero hace el UPDATE de los enrollments a `completed` y después recorre a los alumnos uno por uno para pasarlos a `graduated`.
  - Si falla en el medio (timeout o DB), al reintentar esos enrollments ya no figuran como "eligible", así que esos alumnos nunca se marcan egresados ni reciben su email.
  - Un doble submit concurrente puede mandar los emails dos veces.
  - La regla de egreso es dudosa: un alumno con un enrollment `withdrawn` nunca egresa, y uno que solo terminó el nivel 1 queda "Egresado".
- **Fix propuesto:** `db.transaction` con `UPDATE enrollments … WHERE status='active' AND id IN (…) RETURNING`, y la graduación en un solo `UPDATE students … WHERE NOT EXISTS (…)`. Los emails, después del commit y solo para las filas `RETURNING`. Revisar la regla de egreso con el BA.
- **Esfuerzo:** M · **Cómo verificarlo:** ejecutar el cierre dos veces seguidas: la segunda no cambia nada ni manda emails.

---

### DEV-036 · `promoteStudentAction` no verifica requisitos ni estado

- **Tipo:** Bug · **Severidad:** Baja
- **Archivo:línea:** `src/modules/promotions/actions.ts:15`; `promotions.service.ts:146-153`
- **Descripción:** promueve cualquier `enrollmentId`, aunque no sea apto, esté `withdrawn` o ya esté completado (en ese caso pisa `completedAt`). Si el id no existe, redirige igual al certificado, que da 404. No revalida `/director/year-end`.
- **Fix propuesto:** `UPDATE … WHERE id=? AND status='active' RETURNING`, re-chequear la elegibilidad con los umbrales y devolver error si no se actualizó nada.
- **Esfuerzo:** S · **Cómo verificarlo:** promover un enrollment `withdrawn` devuelve error.

---

### DEV-037 · Asistencia sin validación Zod, con fechas futuras y alertas e IA disparadas dos veces

- **Tipo:** Bug · **Severidad:** Media (lo de fechas futuras **persiste**: test `V1` de `tests/e2e/director/attendance.spec.ts:32`)
- **Archivo:línea:** `src/modules/attendance/actions.ts:135-140`, `:242-246` (sin Zod; `recordAttendanceSchema` en `schemas.ts` existe pero no se usa), `:132-142` (check-then-insert), `:144-207` (alertas + diagnóstico)
- **Descripción y cómo se dispara:**
  - Un `status_x` fuera del enum o una `classDate` inválida generan un error de Postgres y la action lanza.
  - Se aceptan fechas futuras, que cuentan para el % y para el disparo del diagnóstico.
  - Con dos envíos concurrentes, `onConflictDoNothing` evita las filas duplicadas, pero el bloque de alertas y `checkAndTriggerDiagnosticAssessment` corren dos veces: dos emails y dos evaluaciones IA publicadas.
  - Borrar y volver a cargar una sesión también re-dispara el diagnóstico.
- **Fix propuesto:**
  - Usar `recordAttendanceSchema` con `classDate: z.iso.date().refine(d => d <= todayAR())` y `z.enum(["present","absent","late"])`.
  - En `recordBulkAttendance`, usar `.returning()` y disparar las alertas solo si se insertaron filas.
  - Deduplicar el diagnóstico por curso + número de clase.
- **Esfuerzo:** M · **Cómo verificarlo:** el test V1 pasa; un doble submit genera un solo email.

---

### DEV-038 · Riesgo académico: la intervención registrada se pierde en la corrida siguiente y la tendencia cuenta doble

- **Tipo:** Bug · **Severidad:** Media
- **Archivo:línea:** `src/modules/notifications/services/risk-detection.service.ts:95-112` (inserta una fila nueva por alumno en cada corrida, N+1); `getAtRiskStudents` lee la última fila (con `intervenedAt = null`); `insights.service.ts:176-184` (agrupa por día)
- **Impacto:** lo que el director carga con `markIntervenedAction` desaparece del panel al día siguiente. Si en un mismo día corren el cron y el botón manual, la tendencia muestra el doble de alumnos en riesgo.
- **Fix propuesto:**
  - Al insertar, copiar `intervenedAt/By/Note` de la fila anterior si el nivel de riesgo no subió.
  - Hacer un solo `insert(values[])`.
  - En la tendencia, `DISTINCT ON (student_id, date_trunc('day', assessed_at))`.
- **Esfuerzo:** M · **Cómo verificarlo:** intervenir un alumno, correr la detección y verificar que la intervención sigue visible.

---

### DEV-039 · Caché `unstable_cache` inconsistente: tags que nadie invalida y tags invalidados que no existen

- **Tipo:** Bug · **Severidad:** Baja
- **Archivo:línea:** `src/lib/query-cache.ts:4-59` (solo existen los tags `teachers` y `students`, con `revalidate: false`). Mutaciones que no invalidan:
  - `profile/actions.ts:50-60` (cambio de nombre propio).
  - `payments/actions.ts:183` (`runOverdueChecks` suspende alumnos).
  - `students.service`/`teachers.service` update (DEV-017).
  - `updateTag("enrollments")`/`updateTag("courses")` (`promotions/actions.ts:18`, `year-end/actions.ts:176`, `courses/actions.ts`) no tienen efecto porque nadie cachea con esos tags. Year-end gradúa alumnos y no invalida `students`.
- **Impacto:** un alumno suspendido o egresado sigue apareciendo "Activo" en los listados, y los nombres viejos siguen en los selectores. Como `revalidate: false`, esto dura hasta el próximo deploy o hasta otra mutación.
- **Fix propuesto:** `updateTag("students")` en `runOverdueChecksAction` (si `suspended > 0`), en year-end y en profile (según el rol). Quitar los `updateTag` sin efecto, o documentar que son a futuro. Considerar `revalidate: 300` como red de seguridad.
- **Esfuerzo:** S · **Cómo verificarlo:** después de suspender un alumno por mora, `/director/students` lo muestra suspendido sin reiniciar.

---

### DEV-040 · Uploads: el tipo de archivo depende de lo que declara el cliente, quedan archivos huérfanos y el material es global y público

- **Tipo:** Seguridad / Bug · **Severidad:** Media
- **Archivo:línea:**
  - `src/modules/documents/actions.ts:35` (valida `file.type`, que declara el cliente), `:47` (extensión tomada del nombre: `file.name.split(".").pop()`), `:61` (insert sin rollback del archivo), `:82-86` (borra el registro antes que el archivo e ignora el error de `storage.remove`).
  - `src/modules/profile/actions.ts:32-42` (avatar: `contentType: avatarFile.type`, que viene del cliente).
  - Buckets `documents` y `avatars` con `public = true` (verificado en `storage.buckets`).
  - `documents` no tiene `course_id` (`schema.ts:419-433`) y `alumno/documents/page.tsx:5` lista todo.
- **Descripción y cómo se dispara:**
  - Se puede subir `x.png` con `Content-Type: text/html`. El límite de MIME del bucket mitiga en parte, porque valida el content-type declarado y no el contenido.
  - Si falla el insert, el archivo queda subido y público. Si falla el `remove`, el archivo borrado sigue accesible por su URL pública.
  - Los documentos son globales: cualquier alumno ve el material de todos los cursos (contradice "Material por curso" de CLAUDE.md) y cualquiera con la URL los descarga sin autenticarse.
  - El avatar mantiene la misma URL entre subidas, así que se ve la imagen vieja por la caché de CDN (relacionado con SCRUM-124).
- **Fix propuesto:**
  - Derivar la extensión y el `contentType` de un mapa MIME→ext de la whitelist, y verificar los magic bytes (`%PDF`, PNG o JPEG).
  - try/catch del insert con `storage.remove` de compensación.
  - Borrar el archivo antes que el registro.
  - Bucket `documents` privado + `createSignedUrl(path, 300)` después de autorizar.
  - Migración `documents.course_id`.
  - Avatar: `?v=${Date.now()}` en `avatarUrl`.
- **Esfuerzo:** M · **Cómo verificarlo:** subir un HTML renombrado `.pdf` → se rechaza. La URL pública de un documento sin firma da 400/403.

---

### DEV-041 · Crons y notificaciones masivas: envíos duplicados, sin throttling y sin `maxDuration`

- **Tipo:** Rendimiento / Bug · **Severidad:** Baja
- **Archivo:línea:** `src/app/api/cron/{class-reminder,payment-reminder,daily-report}/route.ts` (no registran qué ya se envió); `src/modules/automations/actions.ts:108,133` (disparo manual de lo mismo); `src/modules/notifications/actions.ts:52,63` (`Promise.all` de emails a todo un rol); `notification-settings` `timingHours` no se usa en `cron.service.ts:31-101`
- **Impacto:**
  - Si Vercel reintenta o el director usa el botón manual, el mismo día salen emails duplicados.
  - Una ráfaga a un rol completo puede chocar con el rate limit de Resend, y el error se pierde (DEV-027).
  - Sin `maxDuration`, una corrida larga se corta a mitad.
  - En la UI, "enviar X horas antes" no tiene efecto.
- **Fix propuesto:** tabla `sent_reminders(user_id, kind, ref_date)` con UNIQUE; `resend.batch.send` en grupos de 100; `export const maxDuration = 60` en cada ruta. Usar `timingHours` o sacarlo de la UI.
- **Esfuerzo:** M · **Cómo verificarlo:** llamar dos veces a `/api/cron/class-reminder` el mismo día → una sola tanda de emails.

---

### DEV-042 · `Promise.all` con queries `db.*`: no gana nada con `max: 1` y en `courses` genera una carrera

- **Tipo:** Rendimiento / Bug · **Severidad:** Baja (en `courses/actions.ts`, Media)
- **Archivo:línea:**
  - `src/modules/courses/actions.ts:80-83`: lee `prevCourse` en paralelo con el UPDATE, y la decisión de avisar el cambio de horario depende del orden.
  - `src/modules/enrollments/actions.ts:43-55`.
  - `src/modules/notifications/services/notifications.service.ts:180-187`.
  - `src/modules/attendance/actions.ts:147,161`.
  - `director|administrativo/students/[id]/page.tsx:39-43`.
  - `alumno/assessments/[id]/page.tsx:18`, `profesor/attendance/new/page.tsx:42` y `profesor/assessments/new/page.tsx:15`.
  - Ya estaba como E-01 en `hallazgos.md` (persiste y se amplía).
- **Descripción:** ~~con `max: 1`, postgres.js encola las queries: no hay paralelismo, pero tampoco se cuelga.~~ **Corregido en fase 2, ver DEV-047.** Eso era incorrecto. Con `max: 1`, postgres.js no encola en el cliente: **pipelinea** hasta 100 queries sobre la única conexión (`max_pipeline: 100` por default). A través del pooler transaccional de Supabase (Supavisor, `:6543`), esas queries pipelineadas **no reciben nunca su respuesta** y la conexión queda colgada para todo el proceso. Un `Promise.all` con dos o más `db.*` es uno de los disparadores (el otro son los requests concurrentes). El riesgo de usar `db.` dentro de `db.transaction` también existe: revisé el único caso (`enrollments.service.ts:170`) y usa `tx`. Con el fix de DEV-047 aplicado, este hallazgo vuelve a ser rendimiento puro (Baja).
- **Fix propuesto:** primero, el fix de DEV-047 (`max_pipeline: 0`). Después, `await` secuenciales donde no aporta concurrencia. En `courses`, leer `prevCourse` **antes** del update.
- **Esfuerzo:** S · **Cómo verificarlo:** editar el horario de un curso → el email de cambio sale siempre.

---

### DEV-043 · Warning de React "Received `false` for a non-boolean attribute `error`" — **persiste** (BUG-E)

- **Tipo:** Deuda técnica · **Severidad:** Baja
- **Archivo:línea:** `src/components/ui/Input.tsx:21`
- **Descripción:** `Field` clona **todos** sus hijos con `error: !!error`, incluidos los elementos DOM nativos (`<input type="hidden">` o el `<div>` de botones de cupo, nota y `SchedulePicker`).
- **Fix propuesto:**
  ```diff
  -    isValidElement(child) ? cloneElement(child as React.ReactElement<{ error?: boolean }>, { error: !!error }) : child
  +    isValidElement(child) && typeof child.type !== "string"
  +      ? cloneElement(child as React.ReactElement<{ error?: boolean }>, { error: !!error })
  +      : child
  ```
- **Esfuerzo:** S · **Cómo verificarlo:** abrir `/director/courses/new` y `/director/grades/new`: el warning no aparece en la consola del navegador ni en el dev server.

---

### DEV-044 · Emails: caracteres cirílicos en el texto y HTML sin escapar

- **Tipo:** Bug · **Severidad:** Baja
- **Archivo:línea:** `src/lib/email.ts:390` y `:598` (`comunicате`: las letras "ат" y "е" son cirílicas); todas las plantillas interpolan `fullName`, `courseName`, `title` y `body` (de notificaciones libres) sin escapar
- **Impacto:** el texto queda raro en algunos clientes de correo y puede caer en filtros de spam (homoglifos). Un director o administrativo podría inyectar HTML en las notificaciones por email. El riesgo es bajo porque son usuarios internos, pero el `body` es texto libre.
- **Fix propuesto:** reemplazar por "comunicate" y agregar `escapeHtml()` en cada interpolación.
- **Esfuerzo:** S · **Cómo verificarlo:** `grep -P "[\x{0400}-\x{04FF}]" src` no devuelve nada.

---

### DEV-045 · Validaciones y redirecciones menores

- **Tipo:** Bug · **Severidad:** Baja
- **Detalle (archivo:línea → fix):**
  - `src/modules/marketing/actions.ts:97`: `updateInquiryStatusAction` castea `status` sin Zod y lanza ante un valor inválido → `z.enum`.
  - `src/modules/complaints/actions.ts:9`: `createComplaintAction` no llama `requireRole` → `requireRole(["alumno","profesor"])`. `createComplaintAsProfesorAction` (`:39`) sigue huérfana (E-02 persiste) y revalida `/profesor/complaints`, que no existe.
  - `redirectTo: "/director/..."` fijo en `students/actions.ts:98,143,172`, `enrollments/actions.ts:75,126`, `notifications/actions.ts:81`, `payments/actions.ts:49` y `PaymentForm.tsx:72`: el administrativo termina en el portal de dirección. **Persiste** SCRUM-253 (`tests/e2e/administrativo/students.spec.ts:42`). Fix: derivar el prefijo del rol que devuelve `requireRole`.
  - `courses/actions.ts:60,62` y `teachers/actions.ts:107`: `"" → undefined` impide **quitar** el docente, el aula o la especialización → mapear a `null`. `maxCapacity` puede quedar por debajo de los inscriptos activos → validar.
  - `payments.service.ts:97`: se pueden cargar dos cuotas para el mismo alumno y el mismo `due_date` → índice parcial `UNIQUE (student_id, due_date) WHERE status <> 'cancelled'`.
  - `src/app/api/reports/payments/route.ts:6-11`: a `STATUS_LABELS` le falta `cancelled`. Ningún reporte acepta un rango de fechas.
  - `teacher-evaluations/actions.ts:53`: usa `supabase.auth.getUser()` en una action, contra la convención → `getServerUser()`.
  - `QuizPlayer.tsx:62-64`: ignora el `ActionResult` del submit, así que el error nunca se muestra.
  - `grades/actions.ts:121,125`: re-notifica "Nota publicada" en cada edición y redirige a `/director/...` también al profesor.
- **Esfuerzo:** S (cada uno)

---

### DEV-046 · Deuda técnica: código muerto, duplicación entre portales, convenciones incumplidas

- **Tipo:** Deuda técnica · **Severidad:** Baja
- **Código muerto (sin usos):**
  - Auth: `registerAction`, `registerSchema` (ver DEV-002), `getCurrentUserRole`.
  - Listados y fichas: `getCourses`, `getStudents`, `getUsers`, `getTeachers`, `getTeacherById`, `getCoursesByTeacherProfile`, `getStudentByProfileId`.
  - Notas: `createGrade`/`updateGrade`/`deleteGrade`/`getGradesByStudent`/`getGradeById` (las actions usan el cliente service en lugar del service Drizzle).
  - Asistencia: `getAttendanceByStudent`, `getRecentSessions*`, `recordAttendanceSchema`.
  - Promociones y autoevaluaciones: `getPromotionEligibility`, `getEnrollmentForCertificate`, `getAssessments`, `getAttemptResult`.
  - Evaluación docente: `getEnrollmentsForSurvey`, `getTeacherEvalSummaries`, `getTeacherSurveyAggregate`, `getTeacherObservations`.
  - Notificaciones: `getAllNotifications`, `getMyNotifications`, `getUnreadCount` (justo la que necesita SCRUM-122).
  - Pagos, reportes, reclamos y marketing: `getPaymentSummary`, `getReportsSummary`, `getAllComplaints`, `getMyComplaints`, `getComplaintById`, `getCampaignById`.
  - El patrón general: hay services Drizzle que nadie usa mientras las páginas reimplementan esas mismas queries con el cliente Supabase. Esa es la raíz de DEV-003 y DEV-033.
- **E-02 actualizado:** `markAllAsReadAction` y `markOverduePaymentsAction` **ya están conectadas**. Solo queda huérfana `createComplaintAsProfesorAction`.
- **Duplicación director/administrativo:**
  - `students/[id]`, `enrollments/new`, `payments/[id]` y `grades/page.tsx` son casi idénticas.
  - `generateAssessmentAction` y `generateAssessmentProfesorAction` son copia una de la otra, y el prompt de la IA está triplicado.
  - La restricción por 2+ cuotas está implementada dos veces (cron y automations), con diferencias.
  - Propuesta: componentes con `basePath` y services únicos.
- **Convenciones:** `LEVEL_LABELS` redefinido localmente en `director/students/[id]/page.tsx:23`, `administrativo/students/[id]`, `*/enrollments/[id]`, `director/courses/[id]`, `CourseList`, `StudentList`, `EnrollmentList` y `EnrollmentForm` (contra CLAUDE.md). `src/lib/supabase/admin.ts` y `service.ts` no importan `"server-only"`.
- **Sin paginación:** users, students, enrollments, courses, grades y documents. `director/courses/page.tsx:16-27` trae todas las inscripciones activas solo para contarlas.
- **Config:** `next.config.ts:10` `bodySizeLimit: "12mb"` aplica a **todas** las Server Actions, y solo la subida de documentos lo necesita. No hay alternativa por ruta en las actions, así que conviene llevar el upload a un Route Handler o a una subida directa con signed upload URL de Supabase, y volver al default de 1 MB.
- **Esfuerzo:** M (en conjunto)

---

### DEV-047 · Cuelgue de Drizzle (QA2-011): postgres.js pipelinea queries sobre la conexión única y Supavisor (`:6543`) nunca les responde

- **Tipo:** Bug / Infra · **Severidad:** Alta (bloquea el dev server entero; en Vercel probablemente provoca timeouts esporádicos)
- **Archivo:línea:** `src/lib/drizzle/index.ts:5-11` (`max: 1`, sin `max_pipeline`, por lo que aplica el default de postgres.js 3.4.9, `max_pipeline: 100`; ver `node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/cjs/src/connection.js:172-177` e `index.ts:455`). Disparadores: los `Promise.all` de DEV-042 y cualquier par de requests concurrentes en el mismo proceso (prefetch de links del sidebar, varias pestañas, varios QA contra el mismo `pnpm dev`).
- **Causa raíz:**
  1. **Pipelining de postgres.js.** Cuando hay una query en vuelo y llega otra, postgres.js no espera: escribe la segunda (Parse/Bind/Execute/Sync) en el **mismo socket** y sigue así hasta 100.
  2. **Supavisor en modo transacción no lo soporta.** Las queries pipelineadas quedan sin respuesta. Postgres no las está ejecutando: el backend queda `idle`.
  3. **Nadie corta la espera.** postgres.js no tiene timeout por query y `idle_timeout` no aplica a una conexión con queries pendientes.
  4. **Con `max: 1` cae todo el proceso.** Todas las queries Drizzle siguientes del proceso, de cualquier usuario y página, se encolan detrás.
  - **Por qué parece que "se cuelga después de `/alumno/assessments`":** esa página no tiene nada especial (3 queries secuenciales normales). Fue el request que coincidió en el tiempo con otro. A partir de ahí solo responden las páginas que no usan Drizzle (`/director/students`, `/director/teachers` y `/director/complaints` van por el cliente Supabase/`unstable_cache` y siguen en ~0,5 s en `dev2.log`). Las que usan Drizzle terminan **en tandas**, todas en el mismo instante (69 s, ~2,5 min, 45 s, 30 s, 25 s): es la firma de una cola que se destraba de golpe.
  - **Los `57014 canceling statement due to statement timeout`** son el síntoma secundario de la variante en la que el backend recibió parte del pipeline. El `statement_timeout` efectivo de `postgres` por el pooler es `2min` (lo medí con `current_setting`; viene de la configuración del servidor, no del rol). Cuando salta, devuelve error, la cola avanza y aparecen tandas de ~2,4-2,5 min. No pude explicar del todo el caso de `/administrativo/notifications/new`, que dio 57014 a los 8,9 s; no cambia la conclusión.
  - **Descartado:**
    - **Base lenta:** después del restart del servidor (`pg_postmaster_start_time() = 18:40 UTC`), `pg_stat_statements` no registra ninguna query de la app por encima de 1 s.
    - **Locks y transacciones abiertas:** no hay locks ni `idle in transaction`.
    - **`unstable_cache`:** usa el cliente Supabase, no Drizzle.
    - **`db.` dentro de `tx`:** no hay ningún caso.
    - **Socket half-open:** las queries secuenciales sobre la misma conexión funcionan siempre.
- **Evidencia (reproducción en un proceso aparte, mismo config que `index.ts`; scripts `repro.cjs`/`repro2.cjs` en el scratchpad de la sesión):**

  | Escenario (16 queries triviales: `profiles` + `count(attendance)`) | Resultado |
  |---|---|
  | `:6543`, secuenciales (`await` una por una) | OK, unos 200 ms cada una |
  | `:6543`, concurrentes (`Promise.all`), `max_pipeline` default (100) | **q0 y q1 OK, q2-q15 colgadas más de 170 s**. El monitor por `:5432` muestra **ningún backend activo** para esas queries |
  | `:6543`, concurrentes, `max_pipeline: 1` (deja 2 en vuelo) | **Colgado** más de 40 s |
  | `:6543`, concurrentes, **`max_pipeline: 0`** (sin pipelining) | **OK en 8 de 8 rondas**, 3,4 s por ronda (serializado, ~210 ms de RTT por query) |
  | `:5432` (pooler de sesión), concurrentes con pipelining | OK en 8 de 8 rondas, 0,43 s por ronda |

- **Impacto:**
  - **Dev:** un solo `pnpm dev` compartido por varios QA se traba en minutos, porque la concurrencia está garantizada. Así se ve QA2-011, los skeletons infinitos y probablemente los "timeouts" de la suite E2E de la campaña anterior.
  - **Producción en Vercel:** **sí aplica**, porque usa el mismo código y el mismo pooler `:6543`. Cada instancia tiene su conexión `max: 1`, así que el problema se dispara en las páginas con `Promise.all` de `db.*` (DEV-042) y, con Fluid Compute activo (concurrencia dentro de una instancia), también por requests simultáneos. En una instancia caliente, la conexión colgada sigue colgada para los requests siguientes hasta que la instancia muere o se alcanza `maxDuration`, y el usuario ve 504 o skeleton. Las probabilidades son menores que en dev, pero existen. No lo pude confirmar en los logs de Vercel porque el conector no está autorizado; conviene buscar `FUNCTION_INVOCATION_TIMEOUT` en las rutas `/director/students/[id]`, `/profesor/attendance/new` y `/alumno/assessments/[id]`.
- **Fix propuesto:**
  ```diff
   // src/lib/drizzle/index.ts
   const client = postgres(process.env.DATABASE_URL!, {
     ssl: { rejectUnauthorized: false },
  -  max: 1,              // one connection per serverless invocation
  +  // El dev server es un proceso largo con requests concurrentes: unas pocas conexiones.
  +  // En Vercel cada instancia mantiene 1.
  +  max: process.env.NODE_ENV === "development" ? 5 : 1,
  +  // Supavisor en modo transacción (:6543) no responde a queries pipelineadas:
  +  // sin esto, 2+ queries concurrentes cuelgan la conexión para siempre (DEV-047).
  +  max_pipeline: 0,
     prepare: false,      // required for Supabase transaction-mode pooler (port 6543)
     connect_timeout: 10,
     idle_timeout: 20,
  +  max_lifetime: 60 * 5, // recicla conexiones; red de seguridad ante sockets trabados
   });
  ```
  - `max_pipeline: 0` es **el** fix y alcanza solo. `max: 5` en dev recupera el paralelismo que se pierde al serializar. En producción conviene dejar 1 por el límite de conexiones del pooler free.
  - Defensa opcional: un wrapper con timeout (por ejemplo 20 s) que haga `client.end({ timeout: 0 })` y relance el error, para que un cuelgue futuro falle rápido y no deje sin servicio a todo el proceso.
  - Alternativa válida solo para el dev local: `DATABASE_URL` por `:5432` (modo sesión, donde el pipelining funciona). **No** usarla en Vercel (ver DEV-008 / SCRUM-123).
  - Aplicar el fix requiere reiniciar el dev server. Coordinarlo con los QA, porque hoy no se toca.
- **Esfuerzo:** S
- **Cómo verificarlo:**
  1. `node repro.cjs <repo> 6543 100` cuelga y `node repro.cjs <repo> 6543 0` termina en 8 de 8 rondas. Para la regresión conviene versionarlo como `scripts/diag-pipeline.cjs`.
  2. Con el fix y el dev server reiniciado, repetir el recorrido de QA2-011 con 2 o 3 pestañas en paralelo: ninguna página Drizzle tiene que pasar de ~2 s en el log.
- **Memoria del proyecto (`feedback_drizzle_no_promise_all.md`):** el síntoma que describe es real, pero la causa no. Texto propuesto: *"postgres.js + Supavisor transaction pooler (:6543): las queries pipelineadas nunca reciben respuesta y cuelgan la conexión. Mantener `max_pipeline: 0` en `src/lib/drizzle/index.ts`. Sin eso, cualquier par de queries concurrentes (`Promise.all` con `db.*` o requests simultáneos) cuelga todo el proceso. Con eso, `Promise.all` es seguro pero no paraleliza con `max: 1`."* Además hay que corregir la nota "⚠️ La memoria interna … parece desactualizada" de `docs/qa-backlog.md`: la memoria tenía razón en el síntoma.

---

## 2. Estado de los hallazgos previos (qa-backlog / hallazgos.md)

| Previo | Estado hoy | Referencia |
|---|---|---|
| BUG-D / SCRUM-236 alta de curso | Persiste (`test.fail` en `courses.spec.ts:49`) | No se repite acá |
| BUG-E warning `error` | Persiste | DEV-043 (diff) |
| SCRUM-242 edición no persiste | Persiste: causa raíz confirmada | DEV-017 |
| SCRUM-243 placementTestScore | Persiste | DEV-018 |
| SCRUM-244 reactivar inscripción | Persiste: también saltea cupo y horario | DEV-020 |
| SCRUM-245 reportes 403 para administrativo | Persiste | DEV-024 |
| SCRUM-253 redirect del administrativo a `/director` | Persiste y se repite en más actions | DEV-045 |
| SCRUM-123 puerto de DATABASE_URL en preview | No verificable desde acá (Vercel sin autorizar): sigue abierto | DEV-008 |
| SCRUM-124 avatar en el detalle de usuario | Fuera de este alcance. La caché del avatar agrava el problema | DEV-040 |
| E-01 `Promise.all` | Persiste. La causa real del cuelgue es el pipelining sobre `:6543` | DEV-042, DEV-047 |
| E-02 actions huérfanas | Parcial: queda solo `createComplaintAsProfesorAction` | DEV-045/046 |
| E-04 crons sin secret en dev | Persiste, y además falla si falta la variable en prod | DEV-028 |
| E-05 warnings de ESLint | **Resuelto** (lint en 0) | — |
| Test V1 asistencia futura | Persiste | DEV-037 |
| OBS-1 `getSession()` | Sigue siendo válido, **con la condición** de que el proxy cubra la ruta. Las `/api/*` están fuera del matcher, pero ahí se usa `getUser()`. OK | — |

## 3. Resumen

**47 hallazgos:** 3 Críticos · 12 Altos · 22 Medios · 10 Bajos.

| Severidad | IDs |
|---|---|
| Crítica | DEV-001, DEV-002, DEV-005 |
| Alta | DEV-003, DEV-004, DEV-010, DEV-011, DEV-012, DEV-013, DEV-017, DEV-019, DEV-024, DEV-025, DEV-033, DEV-047 |
| Media | DEV-006, 007, 008, 014, 015, 016, 018, 020, 022, 023, 026, 027, 028, 029, 030, 031, 032, 034, 035, 037, 038, 040 |
| Baja | DEV-009, 021, 036, 039, 041, 042, 043, 044, 045, 046 |

**Orden de ataque recomendado (antes de cualquier feature):**

1. **Hoy (S):** aplicar el fix de una línea de DEV-047 (`max_pipeline: 0`) y reiniciar el dev server en una ventana acordada con QA. Sin código: deshabilitar los signups en Supabase. Correr el `REVOKE` y el `DROP POLICY` de DEV-002. Banear las cuentas `@e2e.test` y `e2e-*` en producción. Cargar `CRON_SECRET` en Vercel.
2. **Esta semana:**
   - DEV-001: invitaciones con token. Mitigación inmediata: rechazar las cuentas ya activas.
   - DEV-005: proyecto Supabase de test separado. Los QA deberían dejar de escribir en producción.
   - DEV-003 y DEV-004: lecturas por servidor y layout `director-only`.
3. **Sprint siguiente:**
   - Helper de propiedad (DEV-010, 011, 013, 015) y encuesta (DEV-012).
   - Correctitud que afecta decisiones: DEV-033, 034, 025, 032.
   - Integridad: DEV-019, 017.
4. El resto, según la priorización del PO.

**Tests que conviene agregar** (vitest, sin DB): `todayAR` y la mora con `vi.setSystemTime` (DEV-032); los umbrales sin redondeo (DEV-034); el parser del JSON de la IA (DEV-016); `assertCron` (DEV-028). Y un test de integración que, con el JWT de un alumno, verifique que `profiles.update({role})` falla (regresión de DEV-002).

---

## 4. Análisis de causa raíz de hallazgos QA (fase 2)

Fuentes: `qa1-director-administrativo.md` (24 QA1), `qa2-profesor-alumno-e2e.md` (16 QA2) e `INCIDENTE-2026-10-13.md`. El análisis es **solo de código y documentos**: no se consultó la base y no se modificó el repo. Cuando el hallazgo es el mismo defecto que un DEV-NNN, se vincula y no se repite el análisis.

### 4.1 Prioritarios

#### QA2-013 · Dirección y administrativo no ven ningún reclamo → **RLS, sin ningún error que descartar**

- **Causa raíz:** `src/app/(dashboard)/director/complaints/page.tsx:20-23` y `administrativo/complaints/page.tsx:20-23` leen `complaints` con `createClient()` del server, o sea con el **JWT del usuario**, sujeto a RLS. En la introspección de fase 1 (§0, `pg_policies`), la **única** policy de `complaints` es `authenticated_select_own_complaints` con `USING ((select auth.uid()) = user_id)`. Para un director o un administrativo eso devuelve **0 filas sin error**: RLS filtra en silencio, no rechaza.
  - **Lo que se pidió confirmar:** el "error descartado" (`const { data } = …` sin mirar `error`) es mala práctica, pero **no es la causa**. Aunque se leyera `error`, vendría `null`.
  - El embed `profiles!user_id` no influye: `staff_select_all_profiles` deja leer los perfiles al staff.
- **El mismo defecto en otros lugares:**
  - `director/complaints/[id]/page.tsx` y `administrativo/complaints/[id]/page.tsx` (el detalle da 404 al staff).
  - Los dashboards `director/page.tsx:59` y `administrativo/page.tsx:51`: el contador "reclamos abiertos" siempre da 0, así que la alerta del panel nunca aparece.
  - Mismo patrón que DEV-003: con RLS, las tablas "own-only" (`complaints`, `notifications`) devuelven vacío al staff, y las `USING (true)` exponen de más.
- **Fix propuesto:** que las páginas de staff lean por Drizzle (bypassea RLS) después de autorizar. Los services ya existen y hoy no se usan (DEV-046):
  ```diff
  // director/complaints/page.tsx (ídem administrativo)
  -  const supabase = await createClient();
  -  const { data } = await supabase.from("complaints").select("…, profiles!user_id(full_name, role)")…
  -  const all = (data ?? []).map(…)
  +  await requireStaffPage(["director", "administrativo"]); // ver DEV-004
  +  const all = await getAllComplaints();                     // complaints.service.ts:7 (Drizzle)
  ```
  - En `[id]`, usar `getComplaintById` (`:50`). En los dashboards, un `count(*) … where status='open'` por Drizzle.
  - **No** agregar una policy de SELECT para staff: va en contra de DEV-003 opción A.
  - Lo accesorio que reporta QA2 (respuesta al alumno, notificación al cambiar el estado, `revalidatePath("/alumno/complaints")`, link `/director/complaints/[id]` en el portal administrativo, `requireRole` en `createComplaintAction`) va como mejora; esto último ya figura en DEV-045.
- **Esfuerzo:** S (listado + detalle + dashboards) · **Cómo verificarlo:** el reclamo del seed y el "E2E QA2 Reclamo…" aparecen para director y administrativo, y el contador del dashboard es mayor que 0.

#### QA1-014 · No se puede dar de alta un curso → **persiste SCRUM-236 / BUG-D, con dos causas más**

- **Causa raíz (son 3, independientes; todas del lado del cliente: el server action está bien):**
  1. **`classDays`, `classTime` y `classDurationMinutes` no están en react-hook-form.** `SchedulePicker.tsx:14-31` maneja su estado con `useState` y `<input type="hidden">`, mientras `CourseForm.tsx:52-54` valida con `zodResolver(createCourseSchema)`, que exige `classDays: z.array(...).min(1)` (`schemas.ts:14`). RHF tiene `undefined` → "expected array, received undefined" y `handleSubmit` nunca llama a la action. La edición no falla porque usa `.partial()` (`CourseForm.tsx:36`).
  2. **"Sin asignar" es inválido en el cliente.** `<option value="">` + `register("teacherId")` → `""` contra `teacherId: z.uuid().optional()` (`schemas.ts:24`) → "Invalid UUID". `.optional()` acepta `undefined`, no `""`. Es el mismo patrón que BUG-C / SCRUM-235 (QA1-015) con `level`.
  3. **Los mensajes salen en inglés.** Zod 4 usa su locale por defecto y el proyecto nunca lo configura. Todo campo sin mensaje propio (`z.uuid()`, `z.array()`, `z.enum()`) muestra el texto en inglés.
- **Fix propuesto:**
  ```diff
  // SchedulePicker.tsx: exponer cambios
  -export function SchedulePicker({ defaultDays = [], defaultTime = "", defaultDuration = 90 }: SchedulePickerProps) {
  +export function SchedulePicker({ defaultDays = [], defaultTime = "", defaultDuration = 90, onChange }: SchedulePickerProps & {
  +  onChange?: (v: { classDays: DayOfWeek[]; classTime: string; classDurationMinutes: number }) => void }) {
  +  useEffect(() => { onChange?.({ classDays: selectedDays, classTime: time, classDurationMinutes: duration }); }, [selectedDays, time, duration]);
  // CourseForm.tsx
  -            <SchedulePicker defaultDays={course?.classDays} …/>
  +            <SchedulePicker defaultDays={course?.classDays} …
  +              onChange={(v) => { form.setValue("classDays", v.classDays, { shouldValidate: form.formState.isSubmitted });
  +                                 form.setValue("classTime", v.classTime); form.setValue("classDurationMinutes", v.classDurationMinutes); }} />
  // schemas.ts: vacío → undefined (sirve también para level en students: BUG-C)
  +const emptyToUndef = <T extends z.ZodTypeAny>(s: T) => z.preprocess((v) => (v === "" ? undefined : v), s);
  -  teacherId: z.uuid().optional(),
  +  teacherId: emptyToUndef(z.uuid("Docente inválido").optional()),
  // src/lib/zod-es.ts (nuevo), importado una vez desde un módulo compartido client/server
  +import { z } from "zod"; z.config(z.locales.es());
  ```
  Agregar también `defaultValues.classDays: course?.classDays ?? []`. En la edición, `"" → null` para poder **quitar** el docente (DEV-045).
- **Esfuerzo:** S · **Cómo verificarlo:** alta con docente y con "Sin asignar" → redirige a la lista. El test `BUG-D` de `courses.spec.ts:49` pasa (sacar `test.fail`). No queda ningún mensaje en inglés.

#### QA1-024 · El buscador de alumnos no filtra al escribir (causa directa del incidente)

- **Causa raíz:** `src/app/(dashboard)/director/students/page.tsx:46-54` (y la copia de `administrativo/students/page.tsx`) es un `<form>` GET con un único `<Input name="q">`, **sin botón, sin `onChange` y sin debounce**. Solo filtra si se aprieta **Enter**, que envía el form y agrega `?q=` (eso confirma lo que el QA dejó "pendiente").
- **Agravantes:**
  - La comparación es `toLowerCase().includes` sin normalizar los acentos (`:22-28`): "nandu" no encuentra a "Ñandú".
  - Filtra sobre `getCachedStudents()`, que puede estar desactualizado (QA2-015 / DEV-039). Un alumno recién creado por otro camino no aparece, y uno borrado por fuera sí.
- **Fix propuesto:** un client component `SearchInput` con `useRouter().replace("?q=…")` y debounce de 300 ms, más un botón "Buscar" visible y el ícono de lupa. Normalizar ambos lados:
  ```ts
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  students = students.filter((s) => [s.fullName, s.email, s.dni].some((f) => norm(f).includes(norm(q))));
  ```
  Mostrar "N resultados para «q»" y un estado vacío "Sin resultados". Aplicar el mismo componente en docentes y usuarios.
- **Esfuerzo:** S · **Cómo verificarlo:** escribir "nandu" → a los 300 ms la URL tiene `?q=nandu` y la tabla muestra solo a "Ñandú".

#### QA1-023 · Borrar un alumno es un borrado duro en cascada que se lleva el historial de pagos → **= DEV-019**

- **Causa raíz:** la misma de DEV-019: `students.service.ts:141-143` hace `DELETE`, y `schema.ts:266` tiene `payments.student_id ON DELETE CASCADE`. `profiles` y `auth.users` quedan huérfanos. Se suman dos causas de UX que DEV-019 no cubría:
  - **La confirmación es genérica.** `ConfirmDialog` no recibe el nombre ni el impacto.
  - **SCRUM-234 / BUG-A.** Después de borrar, la 404 tapa qué se borró: `redirectTo` + `revalidatePath` del detalle. Hay que pasar a `redirect()` server-side.
- **Fix:** el de DEV-019 (baja lógica, `ON DELETE RESTRICT` en payments, borrado físico solo para director y solo sin pagos), más:
  ```tsx
  <ConfirmDialog title={`Dar de baja a ${student.fullName} (DNI ${student.dni})`}
    description={`Tiene ${paymentsCount} pagos y ${enrollmentsCount} inscripciones. Los pagos se conservan.`}
    confirmText="Dar de baja" requireTyping={student.dni} />
  ```
- **Sobre el incidente:** la causa inmediata fue que el script abrió una fila por posición. Las causas del producto son QA1-024, QA1-023/DEV-019 y DEV-017 (que hizo que la "edición" pareciera aplicada). La de infraestructura es DEV-005.
  - Para restaurar, lo correcto es el **reinsert manual** con el mismo `students.id` y `profile_id` y el pago con su `id` (opción 2 del documento del incidente). Conviene hacerlo en una transacción y después invalidar el tag `students`.
  - Hay que **verificar el plan de Supabase**: en Free no hay backups diarios ni PITR.
  - Es un buen caso para el test de regresión de DEV-019: borrar un alumno con pagos no puede eliminar pagos.
- **Esfuerzo:** M (como DEV-019) + S (confirmación).

#### QA2-012 · Las fechas de clase aparecen corridas un día (zona horaria) → **parte nueva + DEV-032**

- **Causa raíz:** son **dos defectos distintos**, que se comportan al revés en dev y en Vercel:
  1. **Formatear una fecha sin hora pasando por `Date`.** `profesor/attendance/new/page.tsx:99` hace `new Date(classDate).toLocaleDateString("es-AR")` y `profesor/attendance/page.tsx:124` lo mismo. `new Date("2026-10-05")` es **medianoche UTC**, y en un proceso con TZ de Argentina (la PC de dev) `toLocaleDateString` lo convierte a las 21:00 del día anterior → "4/10". `alumno/attendance/page.tsx:102` usa `split("-").reverse()` y por eso muestra bien el 13/10: la diferencia profesor/alumno sale de ahí.
     - En Vercel (proceso en UTC) este caso **se ve bien**. Al revés, los `timestamp` (`paid_at`, `created_at`, `completed_at`) se muestran en UTC (+3 h) y desde las 21:00 cambian de día (DEV-032).
     - El patrón se repite: hay **81** llamadas `toLocale*` en `src/` y **ninguna** pasa `timeZone`.
  2. **"Hoy" en UTC.** `profesor/attendance/new/page.tsx:22` usa `new Date().toISOString().split("T")[0]`: en Vercel, después de las 21:00 ART propone la fecha de mañana. Es el mismo que DEV-032.
- **Fix propuesto:** extender `src/lib/dates.ts` de DEV-032:
  ```ts
  export const AR_TZ = "America/Argentina/Cordoba";
  /** Fechas tipo `date` (YYYY-MM-DD): nunca pasan por Date */
  export const fmtDateOnly = (d: string) => { const [y, m, dd] = d.slice(0, 10).split("-"); return `${+dd}/${+m}/${y}`; };
  /** Timestamps: siempre con TZ explícita */
  export const fmtDateTimeAR = (d: Date | string, o: Intl.DateTimeFormatOptions = {}) =>
    new Date(d).toLocaleString("es-AR", { timeZone: AR_TZ, ...o });
  export const todayAR = () => new Intl.DateTimeFormat("en-CA", { timeZone: AR_TZ }).format(new Date());
  ```
  - Reemplazar los 81 usos.
  - Regla de ESLint `no-restricted-syntax` para `toLocaleDateString` sin argumentos.
  - Test con `TZ=America/Argentina/Cordoba` y otro con `TZ=UTC`, para que cubra los dos entornos.
- **Esfuerzo:** M (por la cantidad de sitios) · **Cómo verificarlo:** con `TZ=America/Argentina/Cordoba pnpm dev`, "Clase del 5/10/2026" para `date=2026-10-05`, y la misma fecha en profesor y alumno.

#### QA2-015 · La evaluación docente da 404 y "0 encuestas" (caché con IDs viejos) → **DEV-039, con la causa concreta**

- **Causa raíz:**
  - `director/teacher-evaluations/page.tsx:24-25` toma la lista de docentes de `getCachedTeachers()` (`query-cache.ts:4-30`, `revalidate: false`), pero cuenta las encuestas y arma el detalle con datos **en vivo** (`teacher_surveys.teacher_id`, `[teacherId]/page.tsx:47`).
  - El seed E2E (`scripts/seed-e2e.ts:88-90`) borra los perfiles `@e2e.test`, eso cascadea a `teachers`, y vuelve a insertar (`:133`) docentes **con id nuevo** por SQL directo, sin pasar por `updateTag("teachers")`.
  - La caché sigue con el id viejo: el link va a un `teacherId` que ya no existe (404) y el conteo por id viejo da 0.
  - **Por qué sobrevive al reinicio del dev server:** `unstable_cache` se persiste en disco, en `.next/cache/fetch-cache` (el directorio existe en el repo local).
- **El mismo defecto explica QA1-002:**
  - `/director/students` (cacheado) muestra 17 alumnos, incluidos borrados por el seed como "Adm Alumno", "Detalle" y "Pago CN".
  - `/director/users` (Drizzle en vivo) muestra 14.
  - El dashboard (Supabase en vivo, `status='active'`) muestra 9.
  - El gráfico por nivel suma 13 porque excluye `level = null`.
  - Además, todo borrado o alta hecho por fuera de la app (SQL, scripts, Studio) deja la caché inconsistente también en producción.
- **Fix propuesto:**
  - `revalidate: 300` en las dos `unstable_cache` (red de seguridad).
  - En el seed, al final, invalidar la caché: borrar `.next/cache/fetch-cache` en dev, o mejor `POST /api/revalidate?tag=students,teachers` con un secret (hoy no existe: crearlo).
  - En las pantallas que mezclan fuentes, resolver id y nombre desde la misma fuente que cuenta (la encuesta por `teacher_id` en vivo + join con teachers por Drizzle).
  - Las mutaciones que faltan invalidar están en DEV-039.
- **Esfuerzo:** S · **Cómo verificarlo:** correr `pnpm seed:e2e` sin reiniciar → "Ver informe" del Profesor E2E muestra 1 encuesta, y los tres conteos de QA1-002 coinciden (o se explican en el texto).

#### QA1-003 · Los contadores de pagos no suman el total y cuentan dos veces

- **Causa raíz:** hay **tres criterios distintos** de "vencido":
  - `director/payments/page.tsx:34-41` (y `administrativo/payments/page.tsx`): `pending` cuenta `status === "pending"`, mientras que `overdue` cuenta `isOverdue`, derivado de la fecha (`payments.service.ts:38-40`: `(pending|overdue) && dueDate < today()`). Un `pending` vencido cuenta en las dos tarjetas.
  - El dashboard (`director/page.tsx:69-70`) cuenta por `status` puro y lo muestra como "a vencer".
  - El Excel (`api/reports/payments/route.ts:6-11`) exporta el `status` de la DB.
  - La raíz de la divergencia es **DEV-025**: nadie pasa automáticamente los pagos a `overdue`, así que el `status` de la DB queda viejo y cada pantalla "compensa" a su manera. A eso se suma `today()` en UTC (DEV-032).
- **Fix propuesto:** un único estado efectivo, calculado en un solo lugar:
  ```ts
  // payments/lib/effective-status.ts
  export function effectiveStatus(p: { status: PaymentStatus; dueDate: string }, today = todayAR()) {
    if ((p.status === "pending" || p.status === "overdue") && p.dueDate < today) return "overdue";
    if (p.status === "overdue") return "pending"; // vencimiento corrido a futuro por edición
    return p.status; // paid | cancelled | suspended
  }
  ```
  - Tarjetas, lista, dashboard y Excel agrupan por `effectiveStatus`.
  - Mostrar también "Anulados" para que la suma cierre con el total.
  - Además, el cron de DEV-025 mantiene la DB al día.
- **Esfuerzo:** S · **Cómo verificarlo:** con 1 pending vencido, Pendientes + Vencidos + Pagados + Anulados = total, y el dashboard y el Excel dicen "Vencido".

#### QA1-022 · "Cerrar sesión" cierra todas las sesiones en todos los dispositivos

- **Causa raíz:** `src/modules/auth/actions.ts:113-117` llama a `supabase.auth.signOut()` sin opciones. En `@supabase/supabase-js` el `scope` por defecto es `"global"`: revoca **todos** los refresh tokens del usuario.
- **Impacto real durante la campaña:** el logout de QA1 (~17:54) invalidó las sesiones de `director@e2e.test` de los otros agentes.
- **Fix propuesto:**
  ```diff
  -  await supabase.auth.signOut();
  +  await supabase.auth.signOut({ scope: "local" });
  ```
  Opcional: una acción "Cerrar sesión en todos los dispositivos" con `scope: "global"` en el perfil, útil también como respuesta ante DEV-001.
- **Esfuerzo:** S · **Cómo verificarlo:** con dos navegadores logueados, el logout en uno no afecta al otro.

#### QA1-020 · Links del administrativo que llevan a `/director/...` → **= DEV-045 (SCRUM-253), con la lista ampliada**

- **Causa raíz:** los componentes compartidos tienen las rutas fijas y no reciben el portal:
  - `StudentForm.tsx:167`, `EnrollmentForm.tsx:85`, `PaymentForm.tsx:72` y `NotificationForm.tsx:110` (Cancelar).
  - `GradeList.tsx:47,66,117`, el mismo que causa QA2-002 en el portal profesor.
  - `ComplaintList.tsx:62`.
  - `administrativo/payments/[id]/page.tsx:58` (recibo, E-03).
  - Los `redirectTo` de las actions (`students/actions.ts:98,143,172`, `enrollments/actions.ts:75,126`, `notifications/actions.ts:81`, `payments/actions.ts:49`).
  - El administrativo no rebota porque `director/layout.tsx:9` lo acepta y el proxy solo bloquea una lista negra (DEV-004 / QA1-005). El profesor sí rebota a `/profesor`: QA2-002 lo vio como "termina en el panel sin mensaje".
- **Fix propuesto:** un hook `usePortalBase()` en `src/lib/portal.ts` que devuelva `"/" + usePathname().split("/")[1]` en el cliente. En el servidor, el prefijo se deriva del rol que devuelve `requireRole`:
  ```ts
  export const portalBase = (role: UserRole) => (role === "administrativo" ? "/administrativo" : role === "profesor" ? "/profesor" : "/director");
  ```
  - Todos los `href` y `redirectTo` pasan a `${base}/…`.
  - Para notas del profesor, crear `profesor/grades/[id]` o no mostrar el link.
  - Test E2E: "un administrativo nunca sale de `/administrativo/*`" (SCRUM-253 ya tiene uno con `test.fail`).
- **Esfuerzo:** S-M.

### 4.2 Tabla completa QA → causa → fix

Solo se incluyen los hallazgos de tipo Bug, Seguridad o Rendimiento, más los de UX/texto cuando tienen una causa de código concreta. **"=" significa que es el mismo defecto que el DEV**: se vincula y no se re-analiza.

| QA-ID | DEV / causa raíz (archivo:línea) | Fix | Esf. |
|---|---|---|---|
| QA1-REF-01 | = **DEV-001** | Token de invitación de un solo uso | M |
| QA1-001 | Clases `brand-600` y `brand-400` no definidas en `@theme` (`globals.css:6-13`), usadas en `CourseForm.tsx:123-124`, `update-password/page.tsx:152,229` y `GenerateAssessmentForm.tsx:94` (5 usos) | Agregar `--color-brand-400`/`-600` al `@theme` (o reemplazar por 500/700) | S |
| QA1-002 | Caché `unstable_cache` desactualizada + 3 fuentes con filtros distintos (ver QA2-015) | `revalidate: 300` + invalidar después del seed + una sola definición de "alumno activo" | S |
| QA1-003 | Ver §4.1 (3 criterios de vencido; raíz DEV-025) | `effectiveStatus()` único | S |
| QA1-004 | = **DEV-004** | Layout `director-only` + `app_metadata` | S-M |
| QA1-005 | = **DEV-004** (lista negra incompleta en `proxy.ts:7-18` + `director/layout.tsx:9`) | Lista blanca de pantallas compartidas (decisión de PO/BA) | S |
| QA1-006 | `director/year-end/page.tsx:144` (falta `{" "}`) | Espacio + plural real | S |
| QA1-007 | Plural armado con `+ "es"` (`director/grades/page.tsx:29`, `director/notifications/page.tsx:62`, copias en `administrativo/` y `profesor/`) | Helper `plural(n, "evaluación", "evaluaciones")` | S |
| QA1-008 | `<input type="file">` nativo (`documents/components/*`) | Input oculto + `<label>` estilizado | S |
| QA1-009 | = **DEV-028** + E-04 (bypass `NODE_ENV === "development"` en `api/cron/*/route.ts:5-11`) | `assertCron()` también en dev, más DEV-005 | S |
| QA1-010 | = **DEV-041** (`timingHours` no se lee en `cron.service.ts:31-101`) | Usarlo o sacarlo, y unificar textos | S |
| QA1-011 | `api/reports/*/route.ts`: celdas armadas como string (`toFixed`, `toLocaleDateString`) con `aoa_to_sheet` | Escribir `number`/`Date` con `z: "0.0%"`/`"dd/mm/yyyy"`; nombre con fecha; ocultar la proyección con menos de 2 meses | S |
| QA1-012 | Labels locales en lugar de `LEVEL_LABELS` (`CourseForm.tsx:25`, guía de `StudentForm.tsx`) = **DEV-046** | Usar `LEVEL_LABELS` | S |
| QA1-013 | UX, sin causa técnica única | Guía de patrones | M |
| QA1-014 | Ver §4.1 (= BUG-D + `teacherId ""` + sin locale de Zod) | `setValue` desde `SchedulePicker`, `emptyToUndef`, `z.config(z.locales.es())` | S |
| QA1-015 | = BUG-C / SCRUM-235 (`level ""` contra `z.enum().optional()`), mismo patrón que QA1-014; el texto "se asigna automáticamente" no tiene lógica en `StudentForm.tsx`. El puntaje no se guarda: = **DEV-018** | `emptyToUndef` + sugerir el nivel desde el puntaje (`onChange`) o cambiar el texto | S |
| QA1-016 | = **DEV-047** (cuelgue) + no hay timeout ni `error.tsx` en el cliente (DEV-022) | `max_pipeline: 0`; en `useFormAction`, `AbortController`/timeout de 20 s → toast "No pudimos guardar, reintentá" | S |
| QA1-017 | = **DEV-040** (avatar) | contentType desde una whitelist + magic bytes + `?v=` | S |
| QA1-018 | `loginSchema` sin mensaje de requerido; `/403` sin layout; `Buffer.from(…,"base64url")` no lanza con `%%%` pero `params` mal codificado da 400 en Next | Mensajes, layout de branding en `/403`, try/catch con `notFound()` amigable en invite | S |
| QA1-019 | Tablas sin la variante mobile en `director/promotions/page.tsx` y `year-end/page.tsx` | Tarjetas `md:hidden` como en `StudentList` | S |
| QA1-020 | Ver §4.1 (= **DEV-045** / SCRUM-253) | `portalBase(role)` / `usePortalBase()` | S-M |
| QA1-021 | `CourseForm.tsx:48-50` reemplaza cupo > 15 por 15 en silencio; sin CHECK en la DB (`schema.ts:200`) | Mostrar el valor real con aviso; migración `CHECK (max_capacity BETWEEN 1 AND 15)` después de decidir qué hacer con los cursos de 20 | S |
| QA1-022 | Ver §4.1 (`auth/actions.ts:115`, `signOut()` global) | `signOut({ scope: "local" })` | S |
| QA1-023 | = **DEV-019** + confirmación genérica + BUG-A | Baja lógica, `RESTRICT`, confirmación con nombre e impacto | M |
| QA1-024 | Ver §4.1 (`director/students/page.tsx:46-54`: filtra solo con Enter, sin normalizar acentos) | `SearchInput` con debounce + normalización NFD | S |
| QA2-001 | `profesor/page.tsx:35` imprime `course.level` crudo | `LEVEL_LABELS[course.level] ?? course.level` | S |
| QA2-002 | `GradeList.tsx:47,66,117`, rutas fijas `/director/grades/*` (mismo defecto que QA1-020) | `basePath` + página `profesor/grades/[id]` (`updateGradeAction` ya acepta profesor, con el chequeo de propiedad de **DEV-010**) | S-M |
| QA2-003 | Plural (`profesor/grades/page.tsx:41`, `*/attendance/page.tsx:64/84`) | Helper `plural()` | S |
| QA2-004 | = **DEV-010** (notas), **DEV-011** (asistencia), **DEV-015** (autoevaluaciones) | Helper `assertTeacherOwns…` | M |
| QA2-005 | = **DEV-015** (`profesor/assessments/[id]/page.tsx:29`) | `notFound()` si el curso no es del docente | S |
| QA2-006 | = **DEV-040** (`documents` sin `course_id`, bucket público, `canDelete={false}`) | Migración `course_id`, URLs firmadas, borrado por el autor | M |
| QA2-007 | `NotificationForm.tsx:75` ofrece `role:admin`; `sendToRole` hace `eq(profiles.role, "admin")` (`notifications.service.ts:100`) → Postgres rechaza el valor del enum → la action **lanza**, sin `error.tsx` → pantalla de error (no se envía nada) | Opciones desde el enum (`director`, `administrativo`, `profesor`, `alumno`) + `z.enum` del rol en el schema | S |
| QA2-008 | Texto del menú (`Sidebar.tsx`) | Unificar "Notificaciones" | S |
| QA2-009 | = **DEV-003** (cualquiera lee `teacher_surveys.enrollment_id` por la API) + diseño de `submitSurvey` (`teacher-evaluations.service.ts:57-66`) | Tabla aparte `survey_submissions(enrollment_id UNIQUE)` y `teacher_surveys` **sin** `enrollment_id`; o hash HMAC con un secret del server. Ocultar los comentarios con menos de 3 respuestas | M |
| QA2-010 | = **DEV-012** (encuesta), **DEV-013** (intento sin inscripción), **DEV-014** (`correct`/`explanation` al cliente) | Ver esos DEV | M |
| QA2-011 | = **DEV-047**. Complemento: el portal alumno es el más afectado porque `alumno/layout.tsx:13` (`isStudentAccessRestricted`, Drizzle) se renderiza **en paralelo** con la page, así que cada navegación del alumno ya trae 2 queries concurrentes → pipelining → cuelgue | `max_pipeline: 0` (alcanza). Opcional: pasar `accessRestricted` a una columna leída en `getServerProfile` (Supabase) | S |
| QA2-012 | Ver §4.1 (`new Date("YYYY-MM-DD").toLocaleDateString` + "hoy" en UTC; = **DEV-032** en lo de UTC) | `fmtDateOnly` / `fmtDateTimeAR` / `todayAR` + regla de ESLint | M |
| QA2-013 | Ver §4.1: **RLS** `authenticated_select_own_complaints` con el cliente del usuario; **no** hay error descartado (RLS filtra sin error) | Drizzle `getAllComplaints`/`getComplaintById` después de `requireRole` | S |
| QA2-014 | `alumno/page.tsx` imprime `dueDate`/`amount` crudos y clasifica por `status` (no por vencimiento: raíz **DEV-025**). El bloqueo por 2+ vencidas depende del cron = **DEV-031** (y decisión I-06) | `fmtDateOnly`, `Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS"})`, `effectiveStatus()` (QA1-003), link a Pagos | S |
| QA2-015 | Ver §4.1 (= **DEV-039**: `unstable_cache` sin TTL, persistido en `.next/cache`, + seed que recrea docentes con id nuevo) | `revalidate: 300` + invalidación después del seed + misma fuente para id y conteo | S |
| QA2-016 | `AttendanceTaker.tsx`: fila `flex` con `truncate` en el nombre | `flex-col sm:flex-row` y nombre con `break-words` | S |

**Resumen fase 2:**
- **Ya cubiertos por DEV (vinculados):** QA1-REF-01, 004, 005, 009, 010, 012, 015 (puntaje), 016, 017, 020, 023; QA2-004, 005, 006, 009, 010, 011.
- **Causas nuevas:** QA2-013, QA1-014, QA1-024, QA2-012, QA2-015, QA1-003, QA1-022, QA1-001, QA2-007, QA1-021 y QA1-011.
- **Los que más rinden con poco esfuerzo (todos S):** QA2-013, QA1-014, QA1-022, QA2-007 y QA1-024. Cada uno es menos de 1 h y destraba flujos core.
