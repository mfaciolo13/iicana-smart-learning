import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// El dev server y el seed apuntan al proyecto Supabase de TEST.
dotenv.config({ path: ".env.test" });

// Garantizamos que RESEND_API_KEY tenga un valor stub en el proceso de Playwright
// (y por herencia en cualquier child process que no lo sobreescriba).
// Esto evita que `new Resend(undefined)` explote en tiempo de build/collect.
// IMPORTANTE: esta mutación debe ocurrir ANTES de que se construya el objeto
// `webServer`, ya que el campo `env` lo lee en el mismo tick de evaluación.
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
// process.env del proceso padre con la clave stub.  De este modo, tanto
// `pnpm build` como `pnpm start` (o `pnpm dev`) heredan las variables de
// Supabase, NEXTAUTH, etc. que ya están en el entorno del runner de CI, más
// RESEND_API_KEY, sin depender de la sintaxis POSIX `VAR=val cmd` (que no
// funciona en todos los runners de GitHub Actions según el shell configurado).
const webServerEnv: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  ),
  RESEND_API_KEY: "disabled-for-e2e",
};

// Comando de build: Next.js lee variables de entorno directamente desde el
// entorno del proceso Node que ejecuta el compilador. pnpm no siempre propaga
// el `env` de webServer a sus procesos hijos (depende de la versión y del
// packageManager hook). Para garantizar que RESEND_API_KEY llegue al paso de
// `next build` (donde se hace la page-data collection de /api/cron/*), la
// inyectamos explícitamente mediante `env VAR=val` — comando POSIX estándar
// disponible en todos los runners Linux/macOS de GitHub Actions — en lugar de
// la sintaxis de asignación de shell (`VAR=val cmd`), que algunos shells
// restringen. `env` es un binario del sistema, no una feature del shell.
const buildCommand = "env RESEND_API_KEY=disabled-for-e2e pnpm build";
const startCommand = "env RESEND_API_KEY=disabled-for-e2e pnpm start";
const devCommand = "pnpm dev"; // dev no hace page-data collection estática

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
      // Usamos `env VAR=val cmd` (binario POSIX) en lugar de la sintaxis de
      // asignación de shell (`VAR=val cmd`) para máxima portabilidad en CI.
      // Esto garantiza que RESEND_API_KEY esté presente cuando `next build`
      // hace la page-data collection de rutas API que instancian Resend.
      command: process.env.E2E_PROD
        ? `${buildCommand} && ${startCommand}`
        : devCommand,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` recibe el entorno completo del proceso padre más el stub de
      // RESEND_API_KEY.  Playwright pasa este objeto como entorno del shell
      // que ejecuta `command`, garantizando que tanto `pnpm build` como
      // `pnpm start` en la cadena `&&` lo hereden.
      env: webServerEnv,
    },
  }),
});
