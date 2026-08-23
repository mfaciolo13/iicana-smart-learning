import { test, expect } from "@playwright/test";

const stamp = Date.now();

test.describe("Director · Documentos (Material)", () => {
  test("el listado carga", async ({ page }) => {
    await page.goto("/director/documents");
    await expect(page.getByRole("heading", { name: "Material institucional" })).toBeVisible();
  });

  test("subir un documento de texto", async ({ page }) => {
    const name = `Doc E2E ${stamp}`;
    await page.goto("/director/documents");
    await page.waitForLoadState("networkidle");
    await page.locator("#name").fill(name);
    await page.locator("#file").setInputFiles({
      name: `material-${stamp}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("Material de prueba subido por la suite E2E."),
    });
    await page.getByRole("button", { name: "Subir documento" }).click();
    // Éxito: toast de confirmación. (Requiere el bucket 'documents' en Storage.)
    await expect(
      page.locator("[data-sonner-toast]", { hasText: /subido|correctamente/i }),
    ).toBeVisible({ timeout: 30_000 });
  });
});
