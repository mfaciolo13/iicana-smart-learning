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

// Entorno completo para el proceso hijo del webServer:
// heredamos process.env (incluye variables cargadas por dotenv más arriba)
// y forzamos el stub de RESEND_API_KEY para que next build / next start no
// fallen durante la recolección estática de /api/cron/*.
// Al pasar el objeto completo de process.env evitamos que Playwright reemplace
// el entorno en lugar de fusionarlo (comportamiento observado en algunas
// versiones donde `env` no hereda automáticamente el entorno del padre).
const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
  ),
  RESEND_API_KEY: "disabled-for-e2e",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000,
  // Default de expect: 15s absorbe páginas lentas cuando el dev server está bajo
  // carga durante la suite completa (evita falsos negativos de listas sembradas).
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
      // Usamos comandos simples sin asignación de variables inline (sintaxis POSIX
      // `VAR=value cmd` es frágil en algunos runners CI y no garantiza que la
      // variable llegue a los subprocesos que next invoca internamente).
      // La variable RESEND_API_KEY se inyecta de forma confiable a través del
      // campo `env`, que Playwright pasa como entorno explícito al proceso hijo.
      command: process.env.E2E_PROD
        ? "pnpm build && pnpm start"
        : "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // webServerEnv hereda TODO process.env (variables de CI, Supabase, etc.)
      // más el stub de RESEND_API_KEY. Esto garantiza que tanto `pnpm build`
      // (static-generation de /api/cron/class-reminder y /api/cron/daily-report)
      // como `pnpm start` reciban la clave y no lancen:
      //   "Missing API key. Pass it to the constructor new Resend("re_123")"
      env: webServerEnv,
    },
  }),
});
