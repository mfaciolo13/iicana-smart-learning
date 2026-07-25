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

  // Esperar a que la URL deje de ser /login — cubre cualquier ruta post-login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 60_000,
  });

  // Esperar a que la página post-login esté completamente cargada
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  // Verificar que efectivamente estamos autenticados (no redirigidos de vuelta a /login)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

  // Esperar a que la página muestre contenido real (nav, sidebar, o cualquier elemento
  // del shell autenticado) para garantizar que las cookies/tokens están asentados
  await expect(
    page.locator("nav, aside, [data-testid='sidebar'], main").first()
  ).toBeVisible({ timeout: 30_000 });

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

  // Esperar a que la URL deje de ser /login — cubre cualquier ruta post-login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 60_000,
  });

  // Esperar a que la página post-login esté completamente cargada
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle");

  // Verificar que efectivamente estamos autenticados (no redirigidos de vuelta a /login)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });

  // Esperar a que la página muestre contenido real para garantizar que las
  // cookies/tokens están asentados antes de serializar el estado
  await expect(
    page.locator("nav, aside, [data-testid='sidebar'], main").first()
  ).toBeVisible({ timeout: 30_000 });

  await page.context().storageState({ path: ALUMNO_FILE });
});
