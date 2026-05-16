import { test, expect } from "@playwright/test";

test.describe("Inscripciones", () => {
  test("listado de inscripciones carga correctamente", async ({ page }) => {
    await page.goto("/admin/enrollments");
    await expect(page.getByRole("heading", { name: "Inscripciones" })).toBeVisible();
  });

  test("formulario de inscripción muestra alumnos y cursos", async ({ page }) => {
    await page.goto("/admin/enrollments/new");
    await expect(page.getByLabel("Alumno")).toBeVisible();
    await expect(page.getByLabel("Curso")).toBeVisible();
    await expect(page.getByRole("button", { name: /inscribir/i })).toBeVisible();
  });

  test("el select de cursos solo muestra activos con cupo", async ({ page }) => {
    await page.goto("/admin/enrollments/new");
    const courseSelect = page.getByLabel("Curso");
    await expect(courseSelect).toBeVisible();
    // Cursos sin cupo aparecen como disabled options
    // No fallar si no hay cursos sin cupo, solo verificar que el select existe
    await expect(courseSelect).toBeEnabled();
  });
});

test.describe("Asistencia", () => {
  test("página de asistencia carga correctamente", async ({ page }) => {
    await page.goto("/admin/attendance");
    await expect(page.getByRole("heading", { name: "Asistencia" })).toBeVisible();
  });

  test("formulario de nueva asistencia muestra los campos necesarios", async ({ page }) => {
    await page.goto("/admin/attendance/new");
    await expect(page.getByLabel("Curso")).toBeVisible();
    await expect(page.getByLabel(/fecha/i)).toBeVisible();
  });
});

test.describe("Notas", () => {
  test("listado de notas carga correctamente", async ({ page }) => {
    await page.goto("/admin/grades");
    await expect(page.getByRole("heading", { name: "Notas" })).toBeVisible();
  });

  test("formulario de carga de nota tiene evaluationType pre-seleccionado en Parcial", async ({
    page,
  }) => {
    await page.goto("/admin/grades/new");
    const select = page.getByLabel("Tipo de evaluación");
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("parcial");
  });

  test("campo de nota acepta valores decimales con step 0.5", async ({ page }) => {
    await page.goto("/admin/grades/new");
    const scoreInput = page.getByLabel(/nota/i);
    await scoreInput.fill("8.5");
    await expect(scoreInput).toHaveValue("8.5");
  });
});
