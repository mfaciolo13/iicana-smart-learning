import { test, expect } from "@playwright/test";

const stamp = Date.now();
const NEW_NAME = `E2E Curso CRUD ${stamp}`;
const SEED_COURSE = "E2E Inglés Intermedio"; // del seed

async function fillNewCourse(page: import("@playwright/test").Page, name: string) {
  await page.locator("#name").fill(name);
  await page.locator("#level").selectOption("intermediate");
  await page.getByRole("button", { name: "Lun", exact: true }).click();
  await page.locator('input[name="classTime"]').fill("18:00");
  await page.getByRole("button", { name: "12", exact: true }).click();
}

test.describe("Director · Cursos · listado y detalle", () => {
  test("el listado muestra el curso sembrado", async ({ page }) => {
    await page.goto("/director/courses");
    await expect(page.getByRole("heading", { name: "Cursos" })).toBeVisible();
    await expect(page.getByRole("cell", { name: SEED_COURSE }).first()).toBeVisible();
  });

  test("el detalle del curso sembrado carga", async ({ page }) => {
    await page.goto("/director/courses");
    await page.locator("tr", { hasText: SEED_COURSE }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/courses\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: SEED_COURSE })).toBeVisible({ timeout: 40_000 });
  });
});

test.describe("Director · Cursos · validaciones (casos borde)", () => {
  test("submit vacío no crea ni navega", async ({ page }) => {
    await page.goto("/director/courses/new");
    await page.getByRole("button", { name: "Crear curso" }).click();
    // Nota: el form vacío no muestra errores visibles (feedback ausente, ligado a
    // BUG-D). El contrato robusto es que no se crea ni navega.
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/director\/courses\/new/);
  });

  test("el cupo máximo está limitado a 15 por la UI (regla de negocio)", async ({ page }) => {
    await page.goto("/director/courses/new");
    await expect(page.getByRole("button", { name: "15", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "16", exact: true })).toHaveCount(0);
  });

  // BUG-D — el SchedulePicker no registra classDays/classTime en react-hook-form,
  // así que el zodResolver client-side bloquea SIEMPRE el alta de cursos.
  // Se espera que falle hasta arreglarlo.
  test.fail("BUG-D: crear un curso desde el formulario está bloqueado por la validación", async ({ page }) => {
    await page.goto("/director/courses/new");
    await fillNewCourse(page, NEW_NAME);
    await page.getByRole("button", { name: "Crear curso" }).click();
    await page.waitForURL(/\/director\/courses$/, { timeout: 15_000 });
  });
});

test.describe("Director · Cursos · edición (sobre el curso sembrado)", () => {
  // El alta está rota (BUG-D), pero la edición funciona (schema .partial()).
  // Editamos un campo no identificador (aula) del curso sembrado.
  test("editar el aula del curso sembrado", async ({ page }) => {
    const aula = `Aula ${String(stamp).slice(-3)}`;
    await page.goto("/director/courses");
    await page.locator("tr", { hasText: SEED_COURSE }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/courses\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await page.getByRole("link", { name: "Editar" }).click();
    await page.waitForURL(/\/edit$/);
    await page.locator("#classroom").fill(aula);
    await page.getByRole("button", { name: /Guardar|Actualizar/ }).click();
    await page.waitForURL(/\/director\/courses\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByText(aula).first()).toBeVisible({ timeout: 20_000 });
  });
});
