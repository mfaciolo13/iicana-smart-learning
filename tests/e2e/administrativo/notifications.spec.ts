import { test, expect } from "@playwright/test";

const stamp = Date.now();

test.describe("Administrativo · Comunicaciones", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/administrativo/notifications");
    await expect(page.getByRole("heading", { name: "Comunicaciones" })).toBeVisible();
  });

  test("el administrativo puede enviar una notificación a todos los alumnos", async ({ page }) => {
    await page.goto("/administrativo/notifications/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#targetId").selectOption("role:alumno");
    await page.locator("#title").fill(`Aviso Adm ${stamp}`);
    await page.locator("#body").fill("Mensaje de prueba del administrativo (suite E2E).");
    await page.getByRole("button", { name: "Enviar notificación" }).click();
    // Redirige a /director/notifications (SCRUM-253); toleramos ambos.
    await page.waitForURL(/\/(director|administrativo)\/notifications$/, { timeout: 30_000 });
  });
});
