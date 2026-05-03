import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
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

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
