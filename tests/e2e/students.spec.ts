import { test, expect } from "@playwright/test";

test.describe("Gestión de Alumnos", () => {
  test("listado de alumnos carga correctamente", async ({ page }) => {
    await page.goto("/admin/students");
    await expect(page.getByRole("heading", { name: "Alumnos" })).toBeVisible();
  });

  test("campos requeridos vacíos bloquean el submit", async ({ page }) => {
    await page.goto("/admin/students/new");
    await page.getByRole("button", { name: /registrar alumno|guardar/i }).click();
    // Sin rellenar nada, el navegador bloquea el submit por HTML5 required
    await expect(page).toHaveURL(/\/admin\/students\/new/);
  });

  test("navegar a nuevo alumno muestra el formulario completo", async ({ page }) => {
    await page.goto("/admin/students/new");
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
    await expect(page.getByLabel("DNI")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Fecha de nacimiento")).toBeVisible();
  });
});

test.describe("Gestión de Docentes", () => {
  test("listado de docentes carga correctamente", async ({ page }) => {
    await page.goto("/admin/teachers");
    await expect(page.getByRole("heading", { name: "Docentes" })).toBeVisible();
  });

  test("navegar a nuevo docente muestra el formulario", async ({ page }) => {
    await page.goto("/admin/teachers/new");
    await expect(page.getByLabel("Nombre completo")).toBeVisible();
    await expect(page.getByLabel("DNI")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("campos requeridos vacíos bloquean el submit", async ({ page }) => {
    await page.goto("/admin/teachers/new");
    await page.getByRole("button", { name: /registrar docente|guardar/i }).click();
    await expect(page).toHaveURL(/\/admin\/teachers\/new/);
  });
});
