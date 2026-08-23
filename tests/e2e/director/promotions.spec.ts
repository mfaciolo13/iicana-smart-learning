import { test, expect } from "@playwright/test";

// Promovemos al segundo alumno sembrado (apto), NO al Alumno E2E, cuya
// inscripción otros tests necesitan activa.
const SEED_DNI = "40111223"; // Promo E2E: 100% asistencia + nota 9 → apto

test.describe("Director · Promociones", () => {
  test("el listado carga con los requisitos", async ({ page }) => {
    await page.goto("/director/promotions");
    await expect(page.getByRole("heading", { name: "Promoción de alumnos" })).toBeVisible();
    await expect(page.getByText(/asistencia ≥ 80/i)).toBeVisible();
  });

  test("promover a un alumno apto marca la inscripción como completada", async ({ page }) => {
    await page.goto("/director/promotions");
    // El alumno sembrado es apto → su fila tiene el botón Promover.
    const row = page.locator("tr", { hasText: SEED_DNI });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.getByRole("button", { name: "Promover" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    // Al promover, la app redirige al certificado imprimible.
    await expect(page.getByRole("heading", { name: "Certificado de Promoción" })).toBeVisible({ timeout: 30_000 });
  });
});
