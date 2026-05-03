import { test, expect } from "@playwright/test";

const slug = () => Date.now().toString().slice(-6);

test.describe("Gestión de Cursos", () => {
  test("crear curso con SchedulePicker muestra toast de éxito y aparece en listado", async ({
    page,
  }) => {
    const name = `Inglés Test ${slug()}`;

    await page.goto("/admin/courses/new");

    await page.getByLabel("Nombre del curso").fill(name);
    await page.getByLabel("Nivel").selectOption("intermediate");

    // SchedulePicker: seleccionar días
    await page.getByRole("button", { name: "Lun" }).click();
    await page.getByRole("button", { name: "Mié" }).click();

    // Horario
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill("18:00");
    await timeInputs.nth(1).fill("19:30");

    // Preview debe mostrar el horario compuesto
    await expect(page.getByText("Lun/Mié 18:00–19:30")).toBeVisible();

    await page.getByLabel("Cupo máximo").fill("20");
    await page.getByRole("button", { name: "Guardar" }).click();

    // Toast de éxito
    await expect(page.getByText("Curso creado correctamente")).toBeVisible();

    // Redirige al listado y aparece el curso
    await expect(page).toHaveURL(/\/admin\/courses$/);
    await expect(page.getByText(name)).toBeVisible();
  });

  test("el preview del horario se actualiza en tiempo real", async ({ page }) => {
    await page.goto("/admin/courses/new");

    await page.getByRole("button", { name: "Vie" }).click();
    const timeInputs = page.locator('input[type="time"]');
    await timeInputs.nth(0).fill("09:00");
    await timeInputs.nth(1).fill("10:30");

    await expect(page.getByText("Vie 09:00–10:30")).toBeVisible();
  });

  test("no se puede crear curso sin seleccionar días", async ({ page }) => {
    await page.goto("/admin/courses/new");
    await page.getByLabel("Nombre del curso").fill("Sin horario");
    await page.getByLabel("Nivel").selectOption("beginner");
    await page.getByRole("button", { name: "Guardar" }).click();

    // El campo schedule es required y no tiene valor → no navega
    await expect(page).toHaveURL(/\/admin\/courses\/new/);
  });

  test("listado de cursos muestra los cursos existentes", async ({ page }) => {
    await page.goto("/admin/courses");
    await expect(page.getByRole("heading", { name: "Cursos" })).toBeVisible();
    // La tabla o el mensaje vacío están presentes
    const hasTable = await page.locator("table").isVisible().catch(() => false);
    const hasEmpty = await page.getByText("No hay cursos").isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });
});
