import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// El dev server y el seed apuntan al proyecto Supabase de TEST.
dotenv.config({ path: ".env.test" });

// Garantizamos que RESEND_API_KEY tenga un valor stub en el proceso de Playwright
// (y por herencia en cualquier child process que no lo sobreescriba).
// Esto evita que `new Resend(undefined)` explote en tiempo de build/collect.
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = "disabled-for-e2e";
}

// Rutas de storageState por rol (inline para no importar .ts desde el config —
// el loader de Playwright 1.61 falla al resolver imports .ts en tiempo de config).
const STORAGE = {
  director: "tests/e2e/.auth/director.json",
  administrativo: "tests/e2e/.auth/administrativo.json",
  profesor: "tests/e2e/.auth/profesor.json",
  alumno: "tests/e2e/.auth/alumno.json",
} as const;

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isRemote = baseURL !== "http://localhost:3000";

const chrome = devices["Desktop Chrome"];

// Entorno base que se pasa explícitamente al webServer: fusionamos TODO el
// process.env del proceso padre con la clave stub. De este modo, tanto
// `pnpm build` como `pnpm start` (o `pnpm dev`) heredan las variables de
// Supabase, NEXTAUTH, etc. que ya están en el entorno del runner de CI, más
// RESEND_API_KEY, sin depender de la sintaxis POSIX `VAR=val cmd`.
//
// IMPORTANTE: forzamos RESEND_API_KEY aquí aunque ya venga en process.env,
// para garantizar que no sea sobreescrita por ningún archivo .env.* que
// Next.js cargue durante el build (Next.js respeta variables ya presentes en
// el entorno de proceso sobre las de sus archivos .env, pero sólo si el
// entorno del proceso hijo las tiene seteadas — por eso las inyectamos
// explícitamente en este objeto).
const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  ),
  // Stub explícito: sobreescribe cualquier valor undefined/vacío que pudiera
  // venir del entorno padre o de archivos .env cargados antes del config.
  RESEND_API_KEY: "disabled-for-e2e",
  // SKIP_ENV_VALIDATION evita que librerías de validación (zod/t3-env/envalid)
  // rompan el build cuando otras vars opcionales no están presentes en CI.
  SKIP_ENV_VALIDATION: "1",
};

// Usamos `pnpm dev` en lugar de `pnpm build && pnpm start` para el webServer
// de CI con Supabase de test. Razones:
//
// 1. `pnpm build` ejecuta la page-data collection estática de Next.js, que
//    instancia módulos como Resend en tiempo de build. Si RESEND_API_KEY no
//    llega al subproceso de next build (p.ej. porque un .env.production la
//    sobreescribe con vacío), el build falla — exactamente el error observado.
//
// 2. `pnpm dev` (next dev) NO hace page-data collection estática: las rutas
//    de API se compilan on-demand al primer request, momento en que las
//    variables de entorno del servidor de desarrollo ya están resueltas
//    correctamente desde webServerEnv.
//
// 3. Para tests E2E funcionales contra Supabase de test, dev mode es
//    suficiente y más robusto que el pipeline build+start.
//
// Si se necesita testear el bundle de producción (E2E_PROD=1), se mantiene
// el path de build, pero se agrega SKIP_ENV_VALIDATION y se inyecta la key
// tanto en el env field como en la cadena de comando, maximizando la
// probabilidad de que llegue al proceso de next build.
const devCmd = "pnpm dev";
const prodCmd =
  "sh -c 'RESEND_API_KEY=disabled-for-e2e SKIP_ENV_VALIDATION=1 pnpm build && RESEND_API_KEY=disabled-for-e2e SKIP_ENV_VALIDATION=1 pnpm start'";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  // Default de expect: 15s absorbe páginas lentas cuando el dev server está
  // bajo carga durante la suite completa (evita falsos negativos de listas
  // sembradas).
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    actionTimeout: 30_000,
    // 45s absorbe la compilación on-demand de rutas pesadas en `next dev`.
    navigationTimeout: 45_000,
  },

  projects: [
    // Autentica cada rol una vez y guarda el storageState.
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    // Rutas públicas (sin sesión): login, redirects.
    {
      name: "public",
      testMatch: "public/**/*.spec.ts",
      use: { ...chrome },
    },

    // Un proyecto por rol — cada uno reutiliza su sesión y corre sus specs.
    {
      name: "director",
      testMatch: "director/**/*.spec.ts",
      use: { ...chrome, storageState: STORAGE.director },
      dependencies: ["setup"],
    },
    {
      name: "administrativo",
      testMatch: "administrativo/**/*.spec.ts",
      use: { ...chrome, storageState: STORAGE.administrativo },
      dependencies: ["setup"],
    },
    {
      name: "profesor",
      testMatch: "profesor/**/*.spec.ts",
      use: { ...chrome, storageState: STORAGE.profesor },
      dependencies: ["setup"],
    },
    {
      name: "alumno",
      testMatch: "alumno/**/*.spec.ts",
      use: { ...chrome, storageState: STORAGE.alumno },
      dependencies: ["setup"],
    },
  ],

  ...(!isRemote && {
    webServer: {
      // En el job "build local + Supabase de test" NO seteamos E2E_PROD,
      // por lo que el comando es `pnpm dev`. Esto evita la page-data
      // collection estática de next build que falla cuando RESEND_API_KEY
      // no está disponible en el entorno del subproceso de next build.
      // E2E_PROD=1 se reserva para jobs de smoke-test contra bundle de prod.
      command: process.env.E2E_PROD ? prodCmd : devCmd,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` como campo de Playwright: Playwright inyecta este objeto como
      // entorno completo del proceso hijo (sobreescribiendo el entorno
      // heredado). Combinado con la asignación inline en `command` para el
      // caso E2E_PROD, garantiza máxima cobertura en ambos paths.
      env: webServerEnv,
    },
  }),
});
