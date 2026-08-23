import { test, expect } from "@playwright/test";

const SEED_COURSE = "E2E Inglés Intermedio"; // el profesor sembrado dicta este curso

test.describe("Profesor · Notas", () => {
  test("el listado de notas carga", async ({ page }) => {
    await page.goto("/profesor/grades");
    await expect(page.getByRole("heading", { name: "Notas" })).toBeVisible();
  });

  test("cargar una nota para un alumno de su curso", async ({ page }) => {
    await page.goto("/profesor/grades/new");
    await page.waitForLoadState("networkidle");
    const value = await page.locator("#enrollmentId option", { hasText: SEED_COURSE }).first().getAttribute("value");
    if (!value) throw new Error("La inscripción del curso del profesor no está en el select");
    await page.locator("#enrollmentId").selectOption(value);
    await page.locator("#evaluationType").selectOption("quiz");
    await page.getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("button", { name: "Cargar nota" }).click();
    await page.waitForURL(/\/profesor\/grades$/, { timeout: 30_000 });
    await expect(page.getByRole("cell", { name: "Quiz" }).first()).toBeVisible({ timeout: 20_000 });
  });

  test("cargar nota sin inscripción ni score muestra error", async ({ page }) => {
    await page.goto("/profesor/grades/new");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Cargar nota" }).click();
    await expect(page).toHaveURL(/\/profesor\/grades\/new/);
    await expect(page.getByRole("alert").filter({ hasText: /Inscripción requerida|nota mínima/i }).first()).toBeVisible();
  });
});
