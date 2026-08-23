import { test, expect } from "@playwright/test";

test.describe("Director · Reportes", () => {
  test("la página de reportes carga", async ({ page }) => {
    await page.goto("/director/reports");
    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  });

  // El director SÍ puede descargar los 3 reportes Excel (contraparte de SCRUM-245).
  for (const kind of ["attendance", "grades", "payments"]) {
    test(`descarga /api/reports/${kind} responde 200 (Excel)`, async ({ page }) => {
      const res = await page.request.get(`/api/reports/${kind}`);
      expect(res.status()).toBe(200);
      const ct = res.headers()["content-type"] ?? "";
      expect(ct).toMatch(/sheet|excel|octet-stream/i);
    });
  }
});
