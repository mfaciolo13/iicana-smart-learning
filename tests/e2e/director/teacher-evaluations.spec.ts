import { test, expect } from "@playwright/test";

const SEED_TEACHER = "Profesor E2E";
const SEED_COURSE = "E2E Inglés Intermedio";

async function selectByOptionText(page: import("@playwright/test").Page, selectId: string, text: string) {
  const value = await page.locator(`#${selectId} option`, { hasText: text }).first().getAttribute("value");
  if (!value) throw new Error(`Opción "${text}" no está en #${selectId}`);
  await page.locator(`#${selectId}`).selectOption(value);
}

test.describe("Director · Evaluaciones docentes", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/director/teacher-evaluations");
    await expect(page.getByRole("heading", { name: "Evaluaciones docentes" })).toBeVisible();
  });

  test("registrar una observación de clase", async ({ page }) => {
    await page.goto("/director/teacher-evaluations/new");
    await page.waitForLoadState("networkidle");
    await selectByOptionText(page, "teacherId", SEED_TEACHER);
    // Al elegir docente se filtran sus cursos; damos un instante y seleccionamos.
    await expect(page.locator("#courseId option", { hasText: SEED_COURSE })).toBeAttached({ timeout: 10_000 });
    await selectByOptionText(page, "courseId", SEED_COURSE);
    await page.locator("#observedAt").fill("2026-08-10");
    await page.getByRole("button", { name: "5 estrellas" }).click();
    await page.locator("#observations").fill("La clase mantuvo buen ritmo y participación activa de los alumnos.");
    await page.getByRole("button", { name: "Registrar observación" }).click();
    // Éxito: redirect al listado o toast de confirmación.
    await expect(
      page.locator("[data-sonner-toast]", { hasText: /observación|registrad/i })
        .or(page.getByRole("heading", { name: "Evaluaciones docentes" })),
    ).toBeVisible({ timeout: 30_000 });
  });
});
