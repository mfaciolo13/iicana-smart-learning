import { test, expect } from "@playwright/test";

const SEED_COURSE = "E2E Inglés Intermedio";

test.describe("Administrativo · Asistencia", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/administrativo/attendance");
    await expect(page.getByRole("heading", { name: "Asistencia" })).toBeVisible();
  });

  test("el administrativo puede abrir el tomador de asistencia", async ({ page }) => {
    await page.goto("/administrativo/attendance/new");
    await page.waitForLoadState("networkidle");
    const value = await page.locator("#courseId option", { hasText: SEED_COURSE }).first().getAttribute("value");
    if (!value) throw new Error("Curso sembrado no está en el filtro");
    await page.locator("#courseId").selectOption(value);
    await page.locator("#date").fill("2026-08-19");
    await page.getByRole("button", { name: "Cargar" }).click();
    // El administrativo accede a la toma de asistencia del curso para esa fecha.
    await expect(page.getByRole("heading", { name: /Clase del/ })).toBeVisible({ timeout: 30_000 });
  });
});
