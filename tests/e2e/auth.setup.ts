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

  // Esperar a que la URL cambie desde /login hacia cualquier ruta post-login.
  // El regex cubre: /admin/*, /director/*, /dashboard/*, /panel/*, /home/* u otra
  // ruta raíz que no sea /login. Se usa un timeout generoso por la latencia de prod.
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 60_000 }
  );

  // Esperar a que la página termine de cargar para que las cookies/tokens
  // queden asentados en el storage state
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {
    // networkidle puede no resolverse en SPAs con polling; ignorar y continuar
  });

  // Verificar que efectivamente salimos del login
  const currentURL = page.url();
  if (currentURL.includes("/login")) {
    throw new Error(
      `El login de admin falló — la página sigue en /login. ` +
      `Verificar credenciales E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD.`
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

  // Esperar a que la URL cambie desde /login hacia cualquier ruta post-login.
  // El regex cubre: /alumno/*, /dashboard/*, /home/* u otra ruta que no sea /login.
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 60_000 }
  );

  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {
    // networkidle puede no resolverse en SPAs con polling; ignorar y continuar
  });

  // Verificar que efectivamente salimos del login
  const currentURL = page.url();
  if (currentURL.includes("/login")) {
    throw new Error(
      `El login de alumno falló — la página sigue en /login. ` +
      `Verificar credenciales E2E_ALUMNO_EMAIL / E2E_ALUMNO_PASSWORD.`
    );
  }

  await page.context().storageState({ path: ALUMNO_FILE });
});
