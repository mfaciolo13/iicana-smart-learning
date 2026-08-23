import { test, expect } from "@playwright/test";

test.describe("Autenticación (público, sin sesión)", () => {
  test("login con credenciales inválidas muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");

    await page.getByLabel("Email").fill("no-existe@e2e.test");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(
      page.getByText(/credenciales|inválid|incorrecta|error/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("la página de login tiene los campos correctos", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  });

  for (const route of ["/director", "/administrativo", "/profesor", "/alumno"]) {
    test(`acceder a ${route} sin sesión redirige a /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});
