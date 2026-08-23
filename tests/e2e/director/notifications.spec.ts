import { test, expect } from "@playwright/test";

const stamp = Date.now();

test.describe("Director · Comunicaciones", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/director/notifications");
    await expect(page.getByRole("heading", { name: "Comunicaciones" })).toBeVisible();
  });

  test("enviar sin título/mensaje muestra error y no navega", async ({ page }) => {
    await page.goto("/director/notifications/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#targetId").selectOption("role:alumno");
    await page.getByRole("button", { name: "Enviar notificación" }).click();
    await expect(page.getByText(/requerid|título|mensaje/i).first()).toBeVisible();
    await expect(page).toHaveURL(/\/director\/notifications\/new/);
  });

  test("enviar una notificación a todos los alumnos", async ({ page }) => {
    await page.goto("/director/notifications/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#targetId").selectOption("role:alumno");
    await page.locator("#title").fill(`Aviso E2E ${stamp}`);
    await page.locator("#body").fill("Mensaje de prueba enviado por la suite E2E.");
    await page.getByRole("button", { name: "Enviar notificación" }).click();
    await page.waitForURL(/\/director\/notifications$/, { timeout: 30_000 });
  });
});
