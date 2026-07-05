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
  await page.waitForURL(/\/(director|admin|dashboard)/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  // Verificar que realmente estamos autenticados: debe haber algún elemento
  // de la UI admin (nav, header, o cualquier contenido protegido).
  // Esto asegura que las cookies/tokens están activos antes de serializar.
  await expect(page.locator("body")).not.toContainText("Ingresar", { timeout: 10_000 });

  // Navegar a una ruta admin conocida y confirmar que no redirige a login
  await page.goto("/admin/students");
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

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
  await page.waitForURL(/\/(alumno|dashboard)/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  // Verificar que realmente estamos autenticados antes de serializar el estado
  await expect(page.locator("body")).not.toContainText("Ingresar", { timeout: 10_000 });

  // Navegar a una ruta alumno conocida y confirmar que no redirige a login
  await page.goto("/alumno/grades");
  await page.waitForLoadState("networkidle");
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  await page.context().storageState({ path: ALUMNO_FILE });
});
