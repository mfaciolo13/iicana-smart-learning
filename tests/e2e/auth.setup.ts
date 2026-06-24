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

  // Esperar a que la URL cambie fuera de /login con un regex amplio que cubra
  // todas las rutas posibles post-login: /director, /admin, /dashboard, /home, /
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 60_000 }
  );
  await page.waitForLoadState("networkidle");

  // Verificar que realmente salimos del login (credenciales válidas)
  const currentURL = page.url();
  if (currentURL.includes("/login")) {
    throw new Error(
      `El login admin falló — seguimos en /login. Verificar E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD. URL actual: ${currentURL}`
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

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.fill(email);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: "visible", timeout: 30_000 });
  await passwordInput.fill(password);

  await page.getByRole("button", { name: "Ingresar" }).click();

  // Esperar a que la URL cambie fuera de /login con un regex amplio que cubra
  // todas las rutas posibles post-login: /alumno, /dashboard, /home, /
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 60_000 }
  );
  await page.waitForLoadState("networkidle");

  // Verificar que realmente salimos del login (credenciales válidas)
  const currentURL = page.url();
  if (currentURL.includes("/login")) {
    throw new Error(
      `El login alumno falló — seguimos en /login. Verificar E2E_ALUMNO_EMAIL y E2E_ALUMNO_PASSWORD. URL actual: ${currentURL}`
    );
  }

  await page.context().storageState({ path: ALUMNO_FILE });
});
