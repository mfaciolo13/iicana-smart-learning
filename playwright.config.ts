import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// El dev server y el seed apuntan al proyecto Supabase de TEST.
dotenv.config({ path: ".env.test" });

// ── Stub de RESEND_API_KEY ────────────────────────────────────────────────────
// Next.js lee las variables de entorno en tiempo de BUILD desde:
//   1. process.env del proceso que corre `next build`
//   2. Archivos .env* en la raíz del proyecto (con prioridad decreciente)
//
// La variable RESEND_API_KEY se instancia en /api/cron/class-reminder durante
// la page-data collection de `next build`, y explota si es undefined.
//
// Estrategia defensiva en capas:
//   A) Mutar process.env del proceso de Playwright (ya propaga a webServer.env)
//   B) Escribir un .env.local con el stub → Next.js lo lee automáticamente
//      en cualquier invocación de `next build` o `next dev`, incluso si el
//      proceso padre no tiene la variable (ej: step de CI independiente).
//
// .env.local está en .gitignore por convención de Next.js, así que este write
// no contamina el repo. Lo sobreescribimos solo si la clave real no está ya.
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = "disabled-for-e2e";

  const envLocalPath = path.resolve(process.cwd(), ".env.local");

  // Leer contenido actual para no destruir valores existentes del desarrollador.
  let existing = "";
  try {
    existing = fs.readFileSync(envLocalPath, "utf-8");
  } catch {
    // El archivo no existe: empezamos de cero.
  }

  // Solo añadimos la línea si no hay ya una asignación de RESEND_API_KEY.
  if (!/^\s*RESEND_API_KEY\s*=/m.test(existing)) {
    const stub = "\n# Stub inyectado por playwright.config.ts para E2E\nRESEND_API_KEY=disabled-for-e2e\n";
    fs.writeFileSync(envLocalPath, existing + stub, "utf-8");
  }
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

// Usamos `pnpm build` y `pnpm start` sin prefijo `env VAR=val` porque:
//   1. webServer.env ya inyecta RESEND_API_KEY en el proceso hijo de Playwright.
//   2. .env.local escrito arriba cubre el caso de builds que corran fuera de
//      Playwright (ej: step previo de CI que ejecute `pnpm build` por separado).
// Eliminar el prefijo `env ...` mejora la portabilidad (runners Windows/macOS).
const buildCommand = "pnpm build";
const startCommand = "pnpm start";
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
      command: process.env.E2E_PROD
        ? `${buildCommand} && ${startCommand}`
        : devCommand,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` recibe el entorno completo del proceso padre más el stub de
      // RESEND_API_KEY. Playwright fusiona este objeto como entorno del shell
      // que ejecuta `command`, garantizando que tanto `pnpm build` como
      // `pnpm start` en la cadena `&&` lo hereden.
      env: webServerEnv,
    },
  }),
});
