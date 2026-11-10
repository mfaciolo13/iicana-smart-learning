import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// El dev server y el seed apuntan al proyecto Supabase de TEST.
dotenv.config({ path: ".env.test" });

// Garantizamos que RESEND_API_KEY tenga un valor stub en el proceso de Playwright
// (y por herencia en cualquier child process que no lo sobreescriba).
// Esto evita que `new Resend(undefined)` explote en tiempo de build/collect.
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = "re_placeholder_disabled_for_e2e";
}

// ─── Escribimos un .env.local con el stub ANTES de que next build arranque ───
// Next.js carga .env.local en TODOS los entornos (incluido build) y lo propaga
// a los workers de static-generation / page-data collection, que son los que
// instancian `new Resend(process.env.RESEND_API_KEY)` y causaban el crash.
// Solo escribimos si no existe ya un valor real (para no pisar claves de prod).
const envLocalPath = path.join(process.cwd(), ".env.local");
try {
  const existing = fs.existsSync(envLocalPath)
    ? fs.readFileSync(envLocalPath, "utf8")
    : "";
  if (!existing.includes("RESEND_API_KEY=")) {
    // Añadimos la línea stub al final del archivo (o lo creamos si no existe).
    fs.writeFileSync(
      envLocalPath,
      existing + (existing.endsWith("\n") || existing === "" ? "" : "\n") +
        "RESEND_API_KEY=re_placeholder_disabled_for_e2e\n",
      "utf8"
    );
  }
} catch {
  // Si no tenemos permisos de escritura, continuamos — el env del proceso
  // y el campo `env` del webServer son la segunda línea de defensa.
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
  // Valor stub que satisface `new Resend(key)` sin hacer llamadas reales.
  // Tiene formato válido de Resend key para evitar validaciones de formato.
  RESEND_API_KEY: "re_placeholder_disabled_for_e2e",
};

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
      // Usamos `pnpm build && pnpm start` directamente (sin sh -c wrapper
      // extra) para que pnpm herede el entorno completo definido en `env`
      // abajo. Playwright pasa `env` directamente al proceso spawneado, por
      // lo que todos los subprocesos de pnpm (incluido next build y sus
      // workers de page-data collection) reciben RESEND_API_KEY.
      // El .env.local escrito arriba es la segunda línea de defensa para los
      // workers de Next.js que cargan dotenv independientemente del entorno
      // del proceso padre.
      command: process.env.E2E_PROD
        ? "pnpm build && pnpm start"
        : devCmd,
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 180_000 : 120_000,
      // `env` es el mecanismo principal: Playwright hace spawn del proceso
      // con este objeto como entorno, garantizando que RESEND_API_KEY esté
      // disponible en el proceso de next build y en todos sus workers.
      env: webServerEnv,
    },
  }),
});
