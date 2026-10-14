import { test, expect } from "@playwright/test";

const SEED_COURSE = "E2E Inglés Intermedio";

async function selectCourse(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  const value = await page.locator("#courseId option", { hasText: SEED_COURSE }).first().getAttribute("value");
  if (!value) throw new Error("Curso sembrado no está en el filtro de asistencia");
  await page.locator("#courseId").selectOption(value);
}

test.describe("Director · Asistencia", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/director/attendance");
    await expect(page.getByRole("heading", { name: "Asistencia" })).toBeVisible();
  });

  test("cargar el tomador de asistencia de un curso con su alumno", async ({ page }) => {
    await page.goto("/director/attendance/new");
    await selectCourse(page);
    await page.locator("#date").fill("2026-08-18");
    await page.getByRole("button", { name: "Cargar" }).click();
    // Según si ya hay registro, aparece el tomador ("Guardar asistencia") o el
    // editor ("Guardar corrección"), en ambos casos con la fila del alumno y sus
    // radios de estado. Verifica que el filtro + la carga de inscriptos funciona.
    await expect(page.getByRole("button", { name: /Guardar (asistencia|corrección)/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("radio", { name: "Presente" }).first()).toBeVisible();
  });

  // V1 / SCRUM-240 (corregido) — no se puede tomar lista de una clase FUTURA.
  test("V1: tomar asistencia de una clase futura debería rechazarse", async ({ page }) => {
    await page.goto("/director/attendance/new");
    await selectCourse(page);
    await page.locator("#date").fill("2027-12-31"); // clase futura
    await page.getByRole("button", { name: "Cargar" }).click();
    const saveBtn = page.getByRole("button", { name: /Guardar asistencia/ });
    await expect(saveBtn).toBeVisible({ timeout: 30_000 });
    await saveBtn.click();
    // Muestra un error de "fecha futura".
    await expect(page.locator("[data-sonner-toast]", { hasText: /futura|no puede|posterior/i })).toBeVisible({ timeout: 10_000 });
  });
});
