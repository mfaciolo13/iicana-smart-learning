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
  // Forzamos el stub aquí como capa primaria: el campo `env` del webServer
  // es lo que Playwright inyecta directamente al proceso hijo de pnpm,
  // por lo que es el mecanismo más confiable independientemente del shell.
  RESEND_API_KEY: "disabled-for-e2e",
};

// Usamos `export VAR=val` dentro del bloque sh -c para garantizar que la
// variable esté EXPORTADA al entorno de todos los subprocesos que pnpm
// pueda lanzar (compiladores, workers de Next.js, etc.).
// La diferencia respecto a la asignación inline `VAR=val cmd` es que
// `export` propaga la variable a toda la cadena de subshells/subprocesos,
// mientras que la asignación inline solo la inyecta en el entorno del
// comando inmediato y algunos shells no la propagan más allá.
const buildAndStartCmd =
  "sh -c 'export RESEND_API_KEY=disabled-for-e2e && pnpm build && pnpm start'";
const buildOnlyCmd =
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
      // Usamos `export VAR=val` (en lugar de la asignación inline `VAR=val cmd`)
      // para garantizar que RESEND_API_KEY esté exportada al entorno de todos
      // los subprocesos que pnpm y Next.js lancen durante el build y el start.
      // El campo `env` de Playwright (webServerEnv) actúa como capa adicional.
      command: process.env.E2E_PROD ? buildAndStartCmd : devCmd,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` como campo de Playwright: Playwright fusiona este objeto con el
      // entorno del proceso hijo directamente (sin pasar por el shell), lo que
      // lo convierte en la capa más confiable junto con el `export` del command.
      env: webServerEnv,
    },
  }),
});
