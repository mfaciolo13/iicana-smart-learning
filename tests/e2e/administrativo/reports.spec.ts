import { test, expect } from "@playwright/test";

test.describe("Administrativo · Reportes", () => {
  test("la página de reportes carga", async ({ page }) => {
    await page.goto("/administrativo/reports");
    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  });

  // SCRUM-245 (corregido) — el administrativo puede descargar los reportes que su página ofrece.
  for (const kind of ["attendance", "grades", "payments"]) {
    test(`SCRUM-245: /api/reports/${kind} descarga para administrativo`, async ({ page }) => {
      const res = await page.request.get(`/api/reports/${kind}`);
      expect(res.status(), `status de /api/reports/${kind}`).toBe(200);
    });
  }
});
