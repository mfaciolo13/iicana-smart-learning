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

// Playwright ejecuta el `command` del webServer con `sh -c "<command>"` en
// Linux/macOS. La forma más robusta y portable de garantizar que
// RESEND_API_KEY llegue al proceso de `next build` (donde se hace la
// page-data collection de /api/cron/* que instancia Resend) es incrustarla
// directamente en la cadena de comando como asignación de variable de shell
// POSIX (`VAR=val cmd`). Esto es más confiable que depender del binario `env`
// (que puede no estar en PATH en algunos runners) o del campo `env` del
// webServer (que Playwright puede no propagar a todos los subprocesos de pnpm
// según la versión del package manager).
//
// Usamos `sh -c '...'` explícitamente para garantizar la semántica de
// asignación inline en cualquier runner de GitHub Actions con shell POSIX.
const buildCmd =
  "sh -c 'RESEND_API_KEY=disabled-for-e2e pnpm build'";
const startCmd =
  "sh -c 'RESEND_API_KEY=disabled-for-e2e pnpm start'";
const devCmd = "pnpm dev"; // dev no hace page-data collection estática

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
      // `sh -c 'VAR=val cmd'` es POSIX estándar y garantiza que la variable
      // esté en el entorno del proceso que sh lanza directamente, sin
      // depender del binario `env` ni de la propagación de Playwright.
      // Para el caso `&&`, encadenamos dentro del mismo `sh -c '...'` para
      // que ambos comandos compartan el mismo entorno de shell.
      command: process.env.E2E_PROD
        ? `sh -c 'RESEND_API_KEY=disabled-for-e2e pnpm build && RESEND_API_KEY=disabled-for-e2e pnpm start'`
        : devCmd,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` como campo de Playwright: capa adicional de seguridad que
      // inyecta el entorno completo + stub al proceso hijo. Combinado con la
      // asignación inline en `command`, garantiza máxima cobertura.
      env: webServerEnv,
    },
  }),
});
