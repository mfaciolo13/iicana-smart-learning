import { test, expect } from "@playwright/test";

const stamp = Date.now();
const NAME = `E2E Campaña ${stamp}`;

test.describe("Director · Marketing", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/director/marketing");
    await expect(page.getByRole("heading", { name: "Marketing" })).toBeVisible();
  });

  test("crear una campaña", async ({ page }) => {
    await page.goto("/director/marketing/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#name").fill(NAME);
    await page.locator("#channel").selectOption("social_media");
    // startDate viene con default = hoy
    await page.getByRole("button", { name: "Registrar campaña" }).click();
    await page.waitForURL(/\/director\/marketing$/, { timeout: 30_000 });
    await expect(page.getByText(NAME).first()).toBeVisible({ timeout: 20_000 });
  });

  // V5 / SCRUM-240 (corregido) — endDate anterior a startDate se rechaza (.refine en cliente y servidor).
  test("V5: una campaña con fin anterior al inicio debería rechazarse", async ({ page }) => {
    await page.goto("/director/marketing/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#name").fill(`E2E FechaMala ${stamp}`);
    await page.locator("#channel").selectOption("social_media");
    await page.locator("#startDate").fill("2026-06-01");
    await page.locator("#endDate").fill("2026-01-01"); // fin antes del inicio
    await page.getByRole("button", { name: "Registrar campaña" }).click();
    // Muestra error y NO navega.
    await expect(page.getByText(/fin.*inicio|posterior|inv[aá]lid|rango/i)).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/\/director\/marketing\/new/);
  });
});
