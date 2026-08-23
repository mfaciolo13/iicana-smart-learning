# Tests E2E (Playwright)

Suite end-to-end que valida flujo, funcionalidad y control de acceso **rol por
rol, módulo por módulo**, contra el proyecto Supabase de **test** (nunca prod).

## Puesta a punto (una vez)

1. **`.env.test`** en la raíz con las credenciales del proyecto Supabase de test
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`).
   No se commitea (`.gitignore` cubre `.env*`).

2. **Migraciones** aplicadas en ese proyecto:

   ```bash
   pnpm db:migrate   # usa DATABASE_URL del entorno cargado
   ```

3. **Seed** de datos determinísticos (idempotente — se puede correr N veces):

   ```bash
   pnpm seed:e2e
   ```

   Crea 4 usuarios (uno por rol, password `E2e-Test-2026!`, dominio
   `@e2e.test`) y un set de datos de dominio con prefijo `E2E`. El teardown solo
   borra lo que el propio seed creó, así que es seguro sobre una base con otros
   datos.

## Correr

```bash
pnpm test:e2e          # toda la suite (levanta pnpm dev automáticamente)
pnpm test:e2e -- --project=director   # solo un rol
pnpm test:e2e:ui       # modo interactivo
pnpm test:e2e:report   # abrir el último reporte HTML
```

## Estructura

```
tests/e2e/
├── auth.setup.ts          # login 1x por rol → guarda sesión en .auth/<rol>.json
├── helpers/
│   ├── users.ts           # usuarios y credenciales de prueba
│   ├── routes.ts          # matriz de rutas por rol
│   └── smoke.ts           # aserciones reutilizables de carga / 403 / aislamiento
├── public/                # sin sesión (login, redirects)
├── director/              # specs con sesión de director
├── administrativo/
├── profesor/
└── alumno/
```

Cada rol es un `project` en `playwright.config.ts` que reutiliza su sesión.

## Mapa de cobertura

**Flujo E2E dedicado (crear/editar/borrar + validaciones + casos borde):**
- **Director:** Alumnos, Docentes, Cursos, Inscripciones, Pagos, Notas, Comunicaciones, Marketing, Asistencia, Usuarios (alta administrativo), Promociones (+certificado), Evaluaciones docentes (observación), Reportes (descarga Excel), Documentos (subida).
- **Administrativo:** Alumnos, Pagos, Inscripciones, Asistencia, Comunicaciones (+ Reclamos/Reportes de solo-lectura).
- **Profesor:** Notas (carga), Asistencia.
- **Alumno:** Reclamos (alta), Autoevaluación (rendir de punta a punta).
- **Público:** login + redirects.

**Solo smoke (carga + aislamiento de rol):** el 100% de las rutas de los 4 portales.

**Excluido a propósito (con motivo):**
- **Cierre de ciclo (year-end):** operación global irreversible que marca a *todos* los alumnos como egresados → peligroso sobre la DB de dev compartida.
- **Generación IA de autoevaluaciones:** llama a la API de Anthropic (costo/no-determinismo).
- **Onboarding** (invitación→update-password) y **emails** (Resend solo loguea en dev).
- **Perfil (avatar):** subida de imagen (fixture + bucket).

## Aislamiento de portal (verificado OK)

Cada portal tiene un `layout.tsx` que guarda por rol **del lado del servidor**:

```tsx
if (profile.role !== "profesor") redirect(`/${profile.role}`);
```

Como es un `redirect()` de server component, ocurre antes de renderizar nada, así
que un rol ajeno nunca ve datos de otro portal — es expulsado a su propia home.
`/director/*` admite además a `administrativo`, y `src/proxy.ts` lo saca a `/403`
de las sub-rutas exclusivas de dirección (`ADMIN_ONLY_ROUTES`).

Los tests `*/smoke.spec.ts` de `profesor` y `alumno` verifican este aislamiento.
