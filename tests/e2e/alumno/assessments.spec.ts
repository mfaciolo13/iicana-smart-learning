import { test, expect } from "@playwright/test";

test.describe("Alumno · Autoevaluaciones", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/alumno/assessments");
    await expect(page.getByRole("heading", { name: "Mis Autoevaluaciones" })).toBeVisible();
  });

  test("rendir la autoevaluación sembrada de punta a punta", async ({ page }) => {
    await page.goto("/alumno/assessments");
    // La autoevaluación sembrada ('Present Simple') está pendiente → botón Comenzar.
    await page.getByRole("link", { name: /Comenzar/ }).first().click();
    await page.waitForURL(/\/alumno\/assessments\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    // Q1: "She ___ to school every day." → correcta: "goes"
    await page.getByRole("button", { name: /\bgoes\b/ }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await page.getByRole("button", { name: /Siguiente/ }).click();

    // Q2: "They ___ playing football now." → correcta: "are"
    await page.getByRole("button", { name: /\bare\b/ }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    // Enviar
    await page.getByRole("button", { name: /Enviar evaluación/ }).click();
    await page.waitForURL(/\/alumno\/assessments\/[0-9a-f-]{36}\/resultado$/, { timeout: 30_000 });
    // Ambas correctas → 100%
    await expect(page.getByText(/100\s*%/).first()).toBeVisible({ timeout: 20_000 });
  });
});
