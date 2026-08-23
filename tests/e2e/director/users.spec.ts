import { test, expect } from "@playwright/test";

const stamp = Date.now();

test.describe("Director · Usuarios", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/director/users");
    await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
  });

  test("email inválido al crear administrativo muestra error", async ({ page }) => {
    await page.goto("/director/users/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#fullName").fill("Admin Borde");
    await page.locator("#email").fill("no-es-un-email");
    await page.getByRole("button", { name: "Crear administrativo" }).click();
    await expect(page.getByText(/Email inválido/i)).toBeVisible();
    await expect(page).toHaveURL(/\/director\/users\/new/);
  });

  test("crear un usuario administrativo", async ({ page }) => {
    await page.goto("/director/users/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#fullName").fill("Nuevo Admin");
    await page.locator("#email").fill(`nuevo-admin-${stamp}@e2e.test`);
    await page.locator("#phone").fill("3516789012");
    await page.getByRole("button", { name: "Crear administrativo" }).click();
    // La action redirige al listado de usuarios (o muestra toast de éxito).
    await page.waitForURL(/\/director\/users(\?.*)?$/, { timeout: 30_000 });
  });
});
