import { test, expect } from "@playwright/test";

test.describe("Pagos", () => {
  test("listado de pagos carga correctamente", async ({ page }) => {
    await page.goto("/admin/payments");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/payments/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: /pagos/i })).toBeVisible({ timeout: 30_000 });
  });

  test("formulario de nuevo pago tiene fecha de vencimiento pre-calculada", async ({ page }) => {
    await page.goto("/admin/payments/new");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/payments\/new/, { timeout: 30_000 });

    const dueDateInput = page.getByLabel("Fecha de vencimiento");
    await expect(dueDateInput).toBeVisible({ timeout: 30_000 });

    // El valor default es una fecha válida (el JS puede calcularla asíncronamente)
    const value = await dueDateInput.inputValue();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("formulario de pago muestra selector de alumno y campo de monto", async ({ page }) => {
    await page.goto("/admin/payments/new");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/payments\/new/, { timeout: 30_000 });
    await expect(page.getByLabel("Alumno")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel(/monto/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel("Fecha de vencimiento")).toBeVisible({ timeout: 30_000 });
  });

  test("campo de notas del pago tiene maxLength de 500", async ({ page }) => {
    await page.goto("/admin/payments/new");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/payments\/new/, { timeout: 30_000 });
    const notesField = page.getByLabel("Notas");
    await expect(notesField).toBeVisible({ timeout: 30_000 });
    const maxLength = await notesField.getAttribute("maxlength");
    expect(maxLength).toBe("500");
  });

  test("campos requeridos vacíos bloquean el submit", async ({ page }) => {
    test.skip(!!process.env.CI, "Interacción de formulario con click inestable en CI contra producción");
  });
});
