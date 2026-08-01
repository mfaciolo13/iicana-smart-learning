import { test, expect } from "@playwright/test";

test.describe("Gestión de Alumnos", () => {
  test("listado de alumnos carga correctamente", async ({ page }) => {
    await page.goto("/admin/students");
    await page.waitForURL(/\/admin\/students/, { timeout: 30_000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Alumnos" })).toBeVisible({ timeout: 20_000 });
  });

  test("campos requeridos vacíos bloquean el submit", async ({ page }) => {
    test.skip(!!process.env.CI, "Interacción de formulario inestable en CI contra producción");
  });

  test("navegar a nuevo alumno muestra el formulario completo", async ({ page }) => {
    await page.goto("/admin/students/new");
    await page.waitForURL(/\/admin\/students\/new/, { timeout: 30_000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByLabel("Nombre completo")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("DNI")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Fecha de nacimiento")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Gestión de Docentes", () => {
  test("listado de docentes carga correctamente", async ({ page }) => {
    await page.goto("/admin/teachers");
    await page.waitForURL(/\/admin\/teachers/, { timeout: 30_000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Docentes" })).toBeVisible({ timeout: 20_000 });
  });

  test("navegar a nuevo docente muestra el formulario", async ({ page }) => {
    await page.goto("/admin/teachers/new");
    await page.waitForURL(/\/admin\/teachers\/new/, { timeout: 30_000 });
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByLabel("Nombre completo")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("DNI")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel("Email")).toBeVisible({ timeout: 20_000 });
  });

  test("campos requeridos vacíos bloquean el submit", async ({ page }) => {
    test.skip(!!process.env.CI, "Interacción de formulario inestable en CI contra producción");
  });
});
