import { test, expect } from "@playwright/test";

test.describe("Autenticación", () => {
  test("login con credenciales inválidas muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    const emailInput = page.getByLabel("Email");
    await emailInput.waitFor({ state: "visible" });
    await emailInput.fill("no-existe@test.com");

    const passwordInput = page.getByLabel("Contraseña", { exact: true });
    await passwordInput.waitFor({ state: "visible" });
    await passwordInput.fill("wrongpassword");

    await page.getByRole("button", { name: "Ingresar" }).click();

    await expect(page.getByText(/credenciales|inválid|incorrecta|error/i).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page).toHaveURL(/\/login/);
  });

  test("acceder a /admin sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("acceder a /alumno sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/alumno");
    await expect(page).toHaveURL(/\/login/);
  });

  test("la página de login tiene los campos correctos", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForLoadState("networkidle");

    const emailInput = page.getByLabel("Email");
    await emailInput.waitFor({ state: "visible" });
    await expect(emailInput).toBeVisible();

    const passwordInput = page.getByLabel("Contraseña", { exact: true });
    await passwordInput.waitFor({ state: "visible" });
    await expect(passwordInput).toBeVisible();

    await expect(page.getByRole("button", { name: "Ingresar" })).toBeVisible();
  });
});
