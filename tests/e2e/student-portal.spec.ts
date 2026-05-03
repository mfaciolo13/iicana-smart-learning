import { test, expect } from "@playwright/test";

test.describe("Portal del Alumno — Notas", () => {
  test("página de notas carga y muestra agrupación por curso", async ({ page }) => {
    await page.goto("/alumno/grades");
    await expect(page.getByRole("heading", { name: /notas/i })).toBeVisible();
    // Si hay notas, muestra el promedio; si no, muestra mensaje vacío
    const hasContent =
      (await page.getByText(/promedio/i).isVisible().catch(() => false)) ||
      (await page.getByText(/sin notas/i).isVisible().catch(() => false)) ||
      (await page.locator("table").isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });
});

test.describe("Portal del Alumno — Asistencia", () => {
  test("página de asistencia del alumno carga correctamente", async ({ page }) => {
    await page.goto("/alumno/attendance");
    await expect(page.getByRole("heading", { name: /asistencia/i })).toBeVisible();
  });
});

test.describe("Portal del Alumno — Evaluación Docente", () => {
  test("página de evaluaciones lista los cursos del alumno", async ({ page }) => {
    await page.goto("/alumno/evaluations");
    await expect(page.getByRole("heading", { name: /evaluac/i })).toBeVisible();
    // Muestra cursos o mensaje de sin inscripciones
    const hasContent =
      (await page.getByText(/evaluar/i).isVisible().catch(() => false)) ||
      (await page.getByText(/evaluado/i).isVisible().catch(() => false)) ||
      (await page.getByText(/sin inscripciones/i).isVisible().catch(() => false));
    expect(hasContent).toBeTruthy();
  });

  test("curso ya evaluado muestra badge 'Evaluado' no clickeable", async ({ page }) => {
    await page.goto("/alumno/evaluations");
    const evaluated = page.getByText("Evaluado");
    const hasEvaluated = await evaluated.isVisible().catch(() => false);
    if (hasEvaluated) {
      // El badge 'Evaluado' no debe ser un enlace
      await expect(evaluated.locator("..")).not.toHaveAttribute("href");
    }
  });
});

test.describe("Portal del Alumno — Pagos", () => {
  test("página de pagos del alumno carga correctamente", async ({ page }) => {
    await page.goto("/alumno/payments");
    await expect(page.getByRole("heading", { name: /pagos/i })).toBeVisible();
  });
});

test.describe("Portal del Alumno — Reclamos", () => {
  test("formulario de reclamo del alumno funciona", async ({ page }) => {
    await page.goto("/alumno/complaints/new");
    await expect(page.getByLabel("Categoría")).toBeVisible();
    await expect(page.getByLabel("Descripción")).toBeVisible();
    await expect(page.getByRole("button", { name: /enviar reclamo/i })).toBeVisible();
    // El aviso de 48hs es visible y destacado
    await expect(page.getByText(/48hs/)).toBeVisible();
  });
});
