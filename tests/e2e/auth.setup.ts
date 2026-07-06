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

  // Esperar a que el login complete y redirija al panel admin
  await page.waitForURL(/\/(director|admin|dashboard)/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  // Verificar que la sesión admin es válida navegando a una ruta protegida
  // y esperando que cargue sin redirigir a /login
  await page.goto("/admin/students");
  await page.waitForURL(/\/admin\/students/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  // Confirmar que no fuimos redirigidos a login
  const currentUrl = page.url();
  if (/\/login/.test(currentUrl)) {
    throw new Error(
      "El setup admin falló: después del login fue redirigido a /login en lugar de /admin/students. " +
      "Verificar credenciales E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD."
    );
  }

  // Guardar el estado de autenticación ya validado
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

  // Esperar a que el login complete y redirija al portal alumno
  await page.waitForURL(/\/(alumno|dashboard)/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  // Verificar que la sesión alumno es válida navegando a una ruta protegida
  await page.goto("/alumno/grades");
  await page.waitForURL(/\/(alumno\/grades|alumno\/dashboard|alumno)/, { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  // Confirmar que no fuimos redirigidos a login
  const currentUrl = page.url();
  if (/\/login/.test(currentUrl)) {
    throw new Error(
      "El setup alumno falló: después del login fue redirigido a /login. " +
      "Verificar credenciales E2E_ALUMNO_EMAIL y E2E_ALUMNO_PASSWORD."
    );
  }

  // Guardar el estado de autenticación ya validado
  await page.context().storageState({ path: ALUMNO_FILE });
});
