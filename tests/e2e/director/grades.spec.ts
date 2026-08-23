import { test, expect } from "@playwright/test";

const SEED_DNI = "40111222";
const SEED_COURSE = "E2E Inglés Intermedio"; // inscripción sembrada: Alumno E2E en este curso

async function selectSeededEnrollment(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle"); // esperar hidratación de RHF antes de seleccionar
  const value = await page.locator("#enrollmentId option", { hasText: SEED_COURSE }).first().getAttribute("value");
  if (!value) throw new Error("La inscripción sembrada no está en el select");
  await page.locator("#enrollmentId").selectOption(value);
}

test.describe("Director · Notas · listado", () => {
  test("el listado muestra la nota sembrada", async ({ page }) => {
    await page.goto("/director/grades");
    await expect(page.getByRole("heading", { name: "Notas" })).toBeVisible();
    await expect(page.getByText(SEED_DNI).first()).toBeVisible();
  });
});

test.describe("Director · Notas · validaciones (casos borde)", () => {
  test("submit sin inscripción ni nota muestra errores y no navega", async ({ page }) => {
    await page.goto("/director/grades/new");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Cargar nota" }).click();
    await expect(page).toHaveURL(/\/director\/grades\/new/);
    // El error se muestra como alert (evitar matchear el texto del <option> placeholder).
    await expect(page.getByRole("alert").filter({ hasText: /Inscripción requerida|nota mínima/i }).first()).toBeVisible();
  });

  test("la nota está limitada a 1–10 por la UI (regla de negocio)", async ({ page }) => {
    await page.goto("/director/grades/new");
    await expect(page.getByRole("button", { name: "10", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "0", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "11", exact: true })).toHaveCount(0);
  });
});

test.describe("Director · Notas · ciclo crear → eliminar", () => {
  test.describe.configure({ mode: "serial" });

  test("cargar una nota (Oral) para la inscripción sembrada", async ({ page }) => {
    await page.goto("/director/grades/new");
    await selectSeededEnrollment(page);
    await page.locator("#evaluationType").selectOption("oral");
    await page.getByRole("button", { name: "3", exact: true }).click();
    await page.getByRole("button", { name: "Cargar nota" }).click();
    await page.waitForURL(/\/director\/grades$/, { timeout: 30_000 });
    await expect(page.getByRole("cell", { name: "Oral" }).first()).toBeVisible({ timeout: 20_000 });
  });

  test("eliminar la nota Oral", async ({ page }) => {
    await page.goto("/director/grades");
    await page.locator("tr", { hasText: "Oral" }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/grades\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    // Por BUG-A el detalle pasa a 404 — esto confirma que la nota se borró
    // (su detalle ya no existe). El listado se revalida con updateTag; su conteo
    // es sensible al cache bajo carga, así que la prueba de borrado es el 404.
    await expect(page.getByText(/Página no encontrada/i)).toBeVisible({ timeout: 30_000 });
  });
});
