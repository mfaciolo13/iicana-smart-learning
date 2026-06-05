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
  await page.waitForLoadState("networkidle");

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.fill(password);

  await page.getByRole("button", { name: "Ingresar" }).click();

  // Esperar a que la URL cambie a cualquier ruta autenticada de admin/director
  // con timeout generoso para absorber latencia de producción
  await page.waitForURL(/\/(director|admin)/, { timeout: 30_000 });

  // Verificar que efectivamente estamos autenticados (no en /login)
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Login de admin falló — sigue en /login. Verificar credenciales E2E_ADMIN_EMAIL/PASSWORD. URL: ${currentUrl}`
    );
  }

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
  await page.waitForLoadState("networkidle");

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: "visible" });
  await passwordInput.fill(password);

  await page.getByRole("button", { name: "Ingresar" }).click();

  // Esperar a que la URL cambie a cualquier ruta autenticada de alumno
  // con timeout generoso para absorber latencia de producción
  await page.waitForURL(/\/alumno/, { timeout: 30_000 });

  // Verificar que efectivamente estamos autenticados (no en /login)
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Login de alumno falló — sigue en /login. Verificar credenciales E2E_ALUMNO_EMAIL/PASSWORD. URL: ${currentUrl}`
    );
  }

  await page.context().storageState({ path: ALUMNO_FILE });
});
