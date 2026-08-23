import { test, expect } from "@playwright/test";

test.describe("Administrativo · Reportes", () => {
  test("la página de reportes carga", async ({ page }) => {
    await page.goto("/administrativo/reports");
    await expect(page.getByRole("heading", { name: "Reportes" })).toBeVisible();
  });

  // SCRUM-245 — la página del administrativo ofrece descargar reportes, pero las
  // rutas /api/reports/* solo permiten al rol director → 403. Se espera que estos
  // fallen hasta alinear cliente/servidor.
  for (const kind of ["attendance", "grades", "payments"]) {
    test.fail(`SCRUM-245: /api/reports/${kind} debería descargar para administrativo (hoy 403)`, async ({ page }) => {
      const res = await page.request.get(`/api/reports/${kind}`);
      expect(res.status(), `status de /api/reports/${kind}`).toBe(200);
    });
  }
});
