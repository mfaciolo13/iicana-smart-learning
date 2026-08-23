import { test, expect } from "@playwright/test";

const stamp = Date.now();
const ST = { fullName: "Adm Insc", dni: String(stamp).slice(-8), email: `adm-insc-${stamp}@e2e.test` };
const SEED_COURSE = "E2E Inglés Intermedio";

async function selectByOptionText(page: import("@playwright/test").Page, selectId: string, text: string) {
  const value = await page.locator(`#${selectId} option`, { hasText: text }).first().getAttribute("value");
  if (!value) throw new Error(`Opción "${text}" no está en #${selectId}`);
  await page.locator(`#${selectId}`).selectOption(value);
}

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

test.describe("Administrativo · Inscripciones", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/administrativo/enrollments");
    await expect(page.getByRole("heading", { name: "Inscripciones" })).toBeVisible();
  });

  test("el administrativo puede inscribir un alumno en un curso", async ({ page }) => {
    await createStudentAdmin(page);
    await page.goto("/administrativo/enrollments/new");
    await page.waitForLoadState("networkidle");
    await selectByOptionText(page, "studentId", ST.dni);
    await selectByOptionText(page, "courseId", SEED_COURSE);
    await page.getByRole("button", { name: "Inscribir alumno" }).click();
    await page.waitForURL(/\/(director|administrativo)\/enrollments$/, { timeout: 30_000 });
    await page.goto("/administrativo/enrollments");
    await expect(page.getByRole("cell", { name: new RegExp(ST.dni) }).first()).toBeVisible({ timeout: 20_000 });
  });
});
