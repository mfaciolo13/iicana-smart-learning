import { test, expect } from "@playwright/test";

const stamp = Date.now();

test.describe("Alumno · Reclamos", () => {
  test("el listado de mis reclamos carga", async ({ page }) => {
    await page.goto("/alumno/complaints");
    await expect(page.getByRole("heading", { name: "Mis reclamos" })).toBeVisible();
  });

  test("descripción demasiado corta muestra error y no navega", async ({ page }) => {
    await page.goto("/alumno/complaints/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#type").selectOption("academic");
    await page.locator("#description").fill("Muy corto");
    await page.getByRole("button", { name: "Enviar reclamo" }).click();
    await expect(page.getByText(/al menos 20 caracteres/i)).toBeVisible();
    await expect(page).toHaveURL(/\/alumno\/complaints\/new/);
  });

  test("crear un reclamo válido", async ({ page }) => {
    const desc = `Reclamo E2E ${stamp}: la nota del último parcial no coincide con la corrección entregada en clase.`;
    await page.goto("/alumno/complaints/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#type").selectOption("academic");
    await page.locator("#description").fill(desc);
    await page.getByRole("button", { name: "Enviar reclamo" }).click();
    await page.waitForURL(/\/alumno\/complaints$/, { timeout: 30_000 });
    // El reclamo aparece en mobile-card + tabla desktop; basta con que exista en el DOM.
    await expect(page.getByText(new RegExp(`Reclamo E2E ${stamp}`)).first()).toBeAttached({ timeout: 20_000 });
  });
});
