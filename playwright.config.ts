import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// El dev server y el seed apuntan al proyecto Supabase de TEST.
dotenv.config({ path: ".env.test" });

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
      // E2E_PROD=1 → build de producción (next build && next start).
      // RESEND_API_KEY se neutraliza en ambos pasos (build y start) para que
      // Next.js no falle al recopilar rutas que instancian Resend en tiempo de
      // build (ej: /api/cron/class-reminder). En producción real la variable
      // viene de las secrets del entorno; aquí usamos un valor dummy para que
      // `new Resend(key)` no lance "Missing API key".
      command: process.env.E2E_PROD
        ? "RESEND_API_KEY=disabled-for-e2e pnpm build && RESEND_API_KEY=disabled-for-e2e pnpm start"
        : "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: false,
      timeout: process.env.E2E_PROD ? 300_000 : 120_000,
      // En producción NODE_ENV=production hace que se envíen emails reales; los
      // neutralizamos para la suite (las actions atrapan el fallo de envío).
      env: { RESEND_API_KEY: "disabled-for-e2e" },
    },
  }),
});
