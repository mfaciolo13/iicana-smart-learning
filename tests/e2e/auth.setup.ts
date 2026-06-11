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

  // Aceptar cualquier ruta post-login del panel admin
  await page.waitForURL(/\/(director|admin|dashboard|panel|home)/, { timeout: 60_000 });

  // Esperar a que la página cargue el contenido autenticado — no usar networkidle
  // porque en producción puede haber requests eternos (analytics, polling, etc.)
  await page.waitForLoadState("domcontentloaded");

  // Dar tiempo a que los cookies/tokens de sesión se escriban en storage
  await page.waitForTimeout(2_000);

  // Verificar que realmente estamos autenticados: debe existir algún elemento
  // de navegación del panel admin antes de persistir el estado
  const navOrHeading = page
    .getByRole("navigation")
    .or(page.getByRole("heading").first())
    .or(page.locator("nav, aside, [data-testid='sidebar']").first());
  await navOrHeading.waitFor({ state: "visible", timeout: 20_000 });

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

  // Aceptar cualquier ruta post-login del portal alumno
  await page.waitForURL(/\/(alumno|dashboard|panel|home)/, { timeout: 60_000 });

  // Esperar a que la página cargue el contenido autenticado — no usar networkidle
  await page.waitForLoadState("domcontentloaded");

  // Dar tiempo a que los cookies/tokens de sesión se escriban en storage
  await page.waitForTimeout(2_000);

  // Verificar que realmente estamos autenticados antes de persistir el estado
  const navOrHeading = page
    .getByRole("navigation")
    .or(page.getByRole("heading").first())
    .or(page.locator("nav, aside, [data-testid='sidebar']").first());
  await navOrHeading.waitFor({ state: "visible", timeout: 20_000 });

  await page.context().storageState({ path: ALUMNO_FILE });
});
