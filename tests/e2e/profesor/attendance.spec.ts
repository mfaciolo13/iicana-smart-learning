import { test, expect } from "@playwright/test";

const SEED_COURSE = "E2E Inglés Intermedio"; // el profesor sembrado dicta este curso

test.describe("Profesor · Asistencia", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/profesor/attendance");
    await expect(page.getByRole("heading", { name: "Asistencia" })).toBeVisible();
  });

  test("el profesor puede abrir el tomador de asistencia de su curso", async ({ page }) => {
    await page.goto("/profesor/attendance/new");
    await page.waitForLoadState("networkidle");
    const value = await page.locator("#courseId option", { hasText: SEED_COURSE }).first().getAttribute("value");
    if (!value) throw new Error("El curso del profesor no está en el filtro");
    await page.locator("#courseId").selectOption(value);
    await page.locator("#date").fill("2026-08-20");
    await page.getByRole("button", { name: "Cargar" }).click();
    // El profesor accede a la toma de asistencia de su curso para esa fecha.
    await expect(page.getByRole("heading", { name: /Clase del/ })).toBeVisible({ timeout: 30_000 });
  });
});
