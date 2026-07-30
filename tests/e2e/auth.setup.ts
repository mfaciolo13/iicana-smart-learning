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
  await page.waitForLoadState("networkidle");

  // Verificar explícitamente que llegamos a una ruta admin (no quedamos en /login ni en error)
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `El login de admin falló: la página sigue siendo /login. Verificar credenciales E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.`
    );
  }

  // Asegurarse de que hay una cookie/session válida esperando un elemento de la UI autenticada
  await expect(page.locator("body")).not.toContainText(/inicia sesión|sign in|unauthorized/i, {
    timeout: 10_000,
  });

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
  await page.waitForLoadState("networkidle");

  // Verificar explícitamente que llegamos a una ruta autenticada
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `El login de alumno falló: la página sigue siendo /login. Verificar credenciales E2E_ALUMNO_EMAIL / E2E_ALUMNO_PASSWORD.`
    );
  }

  await page.context().storageState({ path: ALUMNO_FILE });
});
