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

  // Esperar a que la URL cambie fuera de /login (cualquier ruta post-login)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle");

  // Verificar que podemos acceder a una ruta admin protegida
  await page.goto("/admin/students");
  await page.waitForLoadState("networkidle");

  // Si nos redirige a login, la sesión no es válida
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `El admin fue redirigido a /login después de autenticarse. URL actual: ${currentUrl}`
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

  // Esperar a que la URL cambie fuera de /login (cualquier ruta post-login)
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 60_000,
  });
  await page.waitForLoadState("networkidle");

  // Verificar que podemos acceder a una ruta alumno protegida
  await page.goto("/alumno/grades");
  await page.waitForLoadState("networkidle");

  // Si nos redirige a login, la sesión no es válida
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `El alumno fue redirigido a /login después de autenticarse. URL actual: ${currentUrl}`
    );
  }

  await page.context().storageState({ path: ALUMNO_FILE });
});
