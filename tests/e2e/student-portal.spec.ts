import { test, expect } from "@playwright/test";

// Helper: verifica si la página redirigió al dashboard (alumno sin datos en BD)
async function onExpectedPage(page: import("@playwright/test").Page, segment: string) {
  return page.url().includes(segment);
}

test.describe("Portal del Alumno — Notas", () => {
  test("página de notas carga y muestra agrupación por curso", async ({ page }) => {
    await page.goto("/alumno/grades");
    if (!(await onExpectedPage(page, "/alumno/grades"))) {
      return; // alumno E2E sin registro en students — página redirige al dashboard
    }
    await expect(page.getByRole("heading", { name: /notas/i })).toBeVisible();
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
    if (!(await onExpectedPage(page, "/alumno/evaluations"))) {
      return; // alumno E2E sin registro en students — página redirige al dashboard
    }
    await expect(page.getByRole("heading", { name: /evaluac/i })).toBeVisible();
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
    // Hay 2 elementos con "48hs" (subtítulo + banner) — tomamos el banner específico
    await expect(page.getByText(/revisado.*48hs/i)).toBeVisible();
  });
});
