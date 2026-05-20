import { test, expect } from "@playwright/test";

test.describe("Pagos", () => {
  test("listado de pagos carga correctamente", async ({ page }) => {
    await page.goto("/admin/payments");
    await expect(page.getByRole("heading", { name: "Pagos" })).toBeVisible();
  });

  test("formulario de nuevo pago tiene fecha de vencimiento pre-calculada", async ({ page }) => {
    await page.goto("/admin/payments/new");

    const dueDateInput = page.getByLabel("Fecha de vencimiento");
    await expect(dueDateInput).toBeVisible();
    await page.waitForLoadState("networkidle");

    // El valor default es una fecha válida (el JS puede calcularla asíncronamente)
    const value = await dueDateInput.inputValue();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("formulario de pago muestra selector de alumno y campo de monto", async ({ page }) => {
    await page.goto("/admin/payments/new");
    await expect(page.getByLabel("Alumno")).toBeVisible();
    await expect(page.getByLabel(/monto/i)).toBeVisible();
    await expect(page.getByLabel("Fecha de vencimiento")).toBeVisible();
  });

  test("campo de notas del pago tiene maxLength de 500", async ({ page }) => {
    await page.goto("/admin/payments/new");
    const notesField = page.getByLabel("Notas");
    await expect(notesField).toBeVisible();
    const maxLength = await notesField.getAttribute("maxlength");
    expect(maxLength).toBe("500");
  });

  test("campos requeridos vacíos bloquean el submit", async ({ page }) => {
    await page.goto("/admin/payments/new");
    await page.getByRole("button", { name: /registrar pago/i }).click();
    await expect(page).toHaveURL(/\/admin\/payments\/new/);
  });
});
