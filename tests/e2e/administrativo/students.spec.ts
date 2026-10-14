import { test, expect } from "@playwright/test";

const stamp = Date.now();
const NEW = { fullName: `Adm Alumno`, dni: String(stamp).slice(-8), email: `adm-al-${stamp}@e2e.test` };
const SEED_DNI = "40111222";

test.describe("Administrativo · Alumnos", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/administrativo/students");
    await expect(page.getByRole("heading", { name: "Alumnos" })).toBeVisible();
    await expect(page.getByRole("cell", { name: SEED_DNI, exact: true }).first()).toBeVisible();
  });

  test("DNI inválido muestra error inline", async ({ page }) => {
    await page.goto("/administrativo/students/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#fullName").fill("Adm Borde");
    await page.locator("#dni").fill("12");
    await page.locator("#email").fill(`adm-borde-${stamp}@e2e.test`);
    await page.locator("#birthDate").fill("2005-06-15");
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await expect(page.getByText(/DNI debe contener solo números/i)).toBeVisible();
  });

  test("el administrativo puede registrar un alumno", async ({ page }) => {
    await page.goto("/administrativo/students/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#fullName").fill(NEW.fullName);
    await page.locator("#dni").fill(NEW.dni);
    await page.locator("#email").fill(NEW.email);
    await page.locator("#birthDate").fill("2005-06-15");
    await page.locator("#level").selectOption("intermediate");
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    // La action redirige a /director/students (SCRUM-253, cross-portal); toleramos.
    await page.waitForURL(/\/(director|administrativo)\/students$/, { timeout: 30_000 });
    // Verificamos que quedó creado, desde el propio portal administrativo.
    await page.goto("/administrativo/students");
    await expect(page.getByRole("cell", { name: NEW.dni, exact: true }).first()).toBeVisible({ timeout: 20_000 });
  });

  // SCRUM-253 / SCRUM-348 (corregido) — tras crear, el administrativo queda en su propio portal.
  test("SCRUM-253: crear un alumno como administrativo debería quedar en /administrativo", async ({ page }) => {
    const s = String(Date.now()).slice(-8);
    await page.goto("/administrativo/students/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#fullName").fill("Adm Redirect");
    await page.locator("#dni").fill(s);
    await page.locator("#email").fill(`adm-rdr-${s}@e2e.test`);
    await page.locator("#birthDate").fill("2005-06-15");
    await page.locator("#level").selectOption("intermediate");
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await page.waitForURL(/\/administrativo\/students$/, { timeout: 15_000 });
  });
});
