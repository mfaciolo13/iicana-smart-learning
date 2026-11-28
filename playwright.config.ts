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
const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  ),
  RESEND_API_KEY: "disabled-for-e2e",
};

// `export VAR=val` dentro de `sh -c '...'` garantiza que la variable quede
// en el entorno exportado del shell y sea heredada por TODOS los subprocesos
// que pnpm pueda lanzar (workers, child_process.spawn, etc.), a diferencia de
// la asignación inline `VAR=val cmd` que solo aplica al comando inmediato y
// puede no propagarse a subprocesos anidados de pnpm.
//
// El campo `env` de webServer es una segunda capa de seguridad: Playwright lo
// pasa al proceso raíz, pero algunos runners de pnpm no lo reenvían a sus
// workers. El `export` dentro del script de shell cierra ese hueco.
const buildAndStartCmd =
  "sh -c 'export RESEND_API_KEY=disabled-for-e2e && pnpm build && pnpm start'";
const devCmd =
  "sh -c 'export RESEND_API_KEY=disabled-for-e2e && pnpm dev'";

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
      // `export VAR=val` dentro de `sh -c '...'` es POSIX estándar y garantiza
      // que la variable esté en el entorno exportado de TODOS los subprocesos
      // que el shell lance, incluyendo los workers internos de pnpm que a veces
      // no reciben correctamente el `env` inyectado por Playwright.
      // Combinado con el campo `env` de abajo, cubre todos los escenarios.
      command: process.env.E2E_PROD ? buildAndStartCmd : devCmd,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` como campo de Playwright: capa adicional de seguridad que
      // inyecta el entorno completo + stub al proceso hijo. Combinado con el
      // `export` inline en `command`, garantiza máxima cobertura.
      env: webServerEnv,
    },
  }),
});
