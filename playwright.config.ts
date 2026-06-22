import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isRemote = baseURL !== "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  // Timeout global por test: 60s para absorber la latencia de producción
  timeout: 60_000,

  // Timeout global para expects (evita tener que repetir { timeout } en cada assertion)
  expect: {
    timeout: 20_000,
  },

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
    // Timeouts de acción y navegación globales para todos los proyectos
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/admin.json",
      },
      dependencies: ["setup"],
      testIgnore: ["**/auth.spec.ts", "**/student-portal.spec.ts"],
    },
    {
      name: "alumno",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/e2e/.auth/alumno.json",
      },
      dependencies: ["setup"],
      testMatch: ["**/student-portal.spec.ts"],
    },
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      testMatch: ["**/auth.spec.ts"],
    },
  ],

  ...(!isRemote && {
    webServer: {
      command: "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  }),
});
