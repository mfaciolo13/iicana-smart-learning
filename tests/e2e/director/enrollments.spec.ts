import { test, expect } from "@playwright/test";

const stamp = Date.now();
const SEED_DNI = "40111222";
const SEED_COURSE = "E2E Inglés Intermedio";

// Alumno creado por UI: su id queda consistente en el cache (updateTag), a
// diferencia del alumno sembrado (cuyo uuid en el cache de listas puede quedar viejo).
const NEW_STUDENT = { fullName: `Insc Alumno`, dni: String(stamp).slice(-8), email: `insc-${stamp}@e2e.test` };

async function createStudent(page: import("@playwright/test").Page) {
  await page.goto("/director/students/new");
  await page.locator("#fullName").fill(NEW_STUDENT.fullName);
  await page.locator("#dni").fill(NEW_STUDENT.dni);
  await page.locator("#email").fill(NEW_STUDENT.email);
  await page.locator("#birthDate").fill("2005-06-15");
  await page.locator("#level").selectOption("intermediate");
  await page.getByRole("button", { name: "Registrar alumno" }).click();
  await page.waitForURL(/\/director\/students$/, { timeout: 30_000 });
}

async function selectByOptionText(page: import("@playwright/test").Page, selectId: string, text: string) {
  const value = await page.locator(`#${selectId} option`, { hasText: text }).first().getAttribute("value");
  if (!value) throw new Error(`Opción "${text}" no está en #${selectId}`);
  await page.locator(`#${selectId}`).selectOption(value);
}

test.describe("Director · Inscripciones · listado", () => {
  test("el listado muestra la inscripción sembrada", async ({ page }) => {
    await page.goto("/director/enrollments");
    await expect(page.getByRole("heading", { name: "Inscripciones" })).toBeVisible();
    await expect(page.getByRole("cell", { name: new RegExp(SEED_DNI) }).first()).toBeVisible();
  });
});

test.describe("Director · Inscripciones · ciclo crear → duplicado → estado → eliminar", () => {
  test.describe.configure({ mode: "serial" });

  test("inscribir un alumno nuevo en el curso sembrado", async ({ page }) => {
    await createStudent(page);
    await page.goto("/director/enrollments/new");
    await selectByOptionText(page, "studentId", NEW_STUDENT.dni);
    await selectByOptionText(page, "courseId", SEED_COURSE);
    await page.getByRole("button", { name: "Inscribir alumno" }).click();
    await page.waitForURL(/\/director\/enrollments$/, { timeout: 30_000 });
    await expect(page.getByRole("cell", { name: new RegExp(NEW_STUDENT.dni) }).first()).toBeVisible({ timeout: 20_000 });
  });

  test("reinscribir al mismo alumno en el mismo curso es rechazado con toast", async ({ page }) => {
    await page.goto("/director/enrollments/new");
    await selectByOptionText(page, "studentId", NEW_STUDENT.dni);
    await selectByOptionText(page, "courseId", SEED_COURSE);
    await page.getByRole("button", { name: "Inscribir alumno" }).click();
    await expect(
      page.locator("[data-sonner-toast]", { hasText: /ya está inscripto/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/director\/enrollments\/new/);
  });

  test("cambiar el estado de la inscripción a Completado", async ({ page }) => {
    await page.goto("/director/enrollments");
    await page.locator("tr", { hasText: NEW_STUDENT.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/enrollments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await page.locator("#status").selectOption("completed");
    await page.getByRole("button", { name: "Actualizar" }).click();
    await expect(page.getByText("Completado").first()).toBeVisible({ timeout: 20_000 });
  });

  test("eliminar la inscripción", async ({ page }) => {
    await page.goto("/director/enrollments");
    await page.locator("tr", { hasText: NEW_STUDENT.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/enrollments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/Página no encontrada/i)).toBeVisible({ timeout: 30_000 });
    await page.goto("/director/enrollments");
    await expect(page.getByRole("cell", { name: new RegExp(NEW_STUDENT.dni) })).toHaveCount(0);
  });
});
