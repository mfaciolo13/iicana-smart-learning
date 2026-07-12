import { test as setup, expect } from "@playwright/test";
import path from "path";

const ADMIN_FILE = path.join(__dirname, ".auth/admin.json");
const ALUMNO_FILE = path.join(__dirname, ".auth/alumno.json");

setup("autenticar como admin", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Faltan variables de entorno E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD en .env.local"
    );
  }

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.fill(email);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: "visible", timeout: 30_000 });
  await passwordInput.fill(password);

  await page.getByRole("button", { name: "Ingresar" }).click();

  // Esperar a que la URL cambie a cualquier ruta del panel (excluye /login)
  await page.waitForURL(/\/(director|admin|dashboard|panel)/, { timeout: 60_000 });

  // Esperar a que la página esté completamente cargada y el DOM estabilizado
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  // Confirmar que NO estamos en /login (sesión establecida realmente)
  expect(page.url()).not.toMatch(/\/login/);

  // Dar tiempo extra para que las cookies/tokens de sesión se persistan en el storage
  await page.waitForTimeout(1_000);

  await page.context().storageState({ path: ADMIN_FILE });
});

setup("autenticar como alumno", async ({ page }) => {
  const email = process.env.E2E_ALUMNO_EMAIL;
  const password = process.env.E2E_ALUMNO_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Faltan variables de entorno E2E_ALUMNO_EMAIL y E2E_ALUMNO_PASSWORD en .env.local"
    );
  }

  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.fill(email);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: "visible", timeout: 30_000 });
  await passwordInput.fill(password);

  await page.getByRole("button", { name: "Ingresar" }).click();

  // Esperar a que la URL cambie a cualquier ruta del portal alumno (excluye /login)
  await page.waitForURL(/\/(alumno|dashboard|panel)/, { timeout: 60_000 });

  // Esperar a que la página esté completamente cargada y el DOM estabilizado
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  // Confirmar que NO estamos en /login (sesión establecida realmente)
  expect(page.url()).not.toMatch(/\/login/);

  // Dar tiempo extra para que las cookies/tokens de sesión se persistan en el storage
  await page.waitForTimeout(1_000);

  await page.context().storageState({ path: ALUMNO_FILE });
});
