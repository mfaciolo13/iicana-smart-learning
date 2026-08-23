import { test, expect } from "@playwright/test";

const stamp = Date.now();
const ST = { fullName: "Adm Pago", dni: String(stamp).slice(-8), email: `adm-pago-${stamp}@e2e.test` };

async function createStudentAdmin(page: import("@playwright/test").Page) {
  await page.goto("/administrativo/students/new");
  await page.waitForLoadState("networkidle");
  await page.locator("#fullName").fill(ST.fullName);
  await page.locator("#dni").fill(ST.dni);
  await page.locator("#email").fill(ST.email);
  await page.locator("#birthDate").fill("2005-06-15");
  await page.locator("#level").selectOption("intermediate");
  await page.getByRole("button", { name: "Registrar alumno" }).click();
  await page.waitForURL(/\/(director|administrativo)\/students$/, { timeout: 30_000 });
}

test.describe("Administrativo · Pagos", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/administrativo/payments");
    await expect(page.getByRole("heading", { name: "Pagos" })).toBeVisible();
  });

  test("el administrativo puede registrar un pago", async ({ page }) => {
    await createStudentAdmin(page);
    await page.goto("/administrativo/payments/new");
    await page.waitForLoadState("networkidle");
    await page.locator("#studentId").selectOption({ label: `${ST.fullName} — ${ST.dni}` });
    await page.locator("#amount").fill("15000");
    await page.getByRole("button", { name: "Registrar pago" }).click();
    // Redirige al detalle del pago (/director|/administrativo)/payments/[uuid].
    await page.waitForURL(/\/(director|administrativo)\/payments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Detalle del pago" })).toBeVisible({ timeout: 20_000 });
  });
});
