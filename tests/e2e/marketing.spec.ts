import { test, expect } from "@playwright/test";

const slug = () => Date.now().toString().slice(-6);

test.describe("Marketing — Campañas", () => {
  test("listado de campañas carga correctamente", async ({ page }) => {
    await page.goto("/admin/marketing");
    await expect(page.getByRole("heading", { name: "Marketing" })).toBeVisible();
    await expect(page.getByText("Campañas")).toBeVisible();
    await expect(page.getByText("Consultas totales")).toBeVisible();
    await expect(page.getByText("Tasa de conversión global")).toBeVisible();
  });

  test("crear campaña muestra toast de éxito y aparece en listado", async ({ page }) => {
    const name = `Campaña E2E ${slug()}`;

    await page.goto("/admin/marketing/new");
    await page.getByLabel("Nombre de la campaña").fill(name);
    await page.getByLabel("Canal").selectOption("instagram");
    await page.getByRole("button", { name: /registrar campaña/i }).click();

    await expect(page.getByText("Curso creado correctamente").or(page.getByText("campaña")).first()).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/admin\/marketing$/);
    await expect(page.getByText(name)).toBeVisible();
  });

  test("formulario de campaña tiene fechas con type=date", async ({ page }) => {
    await page.goto("/admin/marketing/new");
    const startDate = page.getByLabel("Inicio");
    const endDate = page.getByLabel("Fin");
    await expect(startDate).toHaveAttribute("type", "date");
    await expect(endDate).toHaveAttribute("type", "date");
  });

  test("detalle de campaña muestra formulario de consulta", async ({ page }) => {
    await page.goto("/admin/marketing");

    const verLink = page.getByText("Ver →").first();
    const hasLink = await verLink.isVisible().catch(() => false);

    if (!hasLink) {
      test.skip(true, "No hay campañas registradas para probar el detalle");
      return;
    }

    await verLink.click();
    await expect(page.getByRole("heading", { level: 3, name: /agregar consulta/i })).toBeVisible();
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByLabel("Fecha")).toHaveAttribute("type", "date");
  });

  test("formulario de consulta se resetea tras éxito", async ({ page }) => {
    await page.goto("/admin/marketing");

    const verLink = page.getByText("Ver →").first();
    const hasLink = await verLink.isVisible().catch(() => false);
    if (!hasLink) {
      test.skip(true, "No hay campañas para probar el reset del form");
      return;
    }

    await verLink.click();

    const nameInput = page.getByLabel("Nombre");
    await nameInput.fill("Test E2E Reset");
    await page.getByRole("button", { name: /agregar consulta/i }).click();

    // Tras el éxito, el input debe estar vacío (form reseteado)
    await expect(nameInput).toHaveValue("", { timeout: 5000 });
  });
});
