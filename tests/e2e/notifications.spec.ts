import { test, expect } from "@playwright/test";

test.describe("Notificaciones", () => {
  test("página de notificaciones carga correctamente", async ({ page }) => {
    await page.goto("/admin/notifications");
    await expect(page.getByRole("heading", { name: "Comunicaciones" })).toBeVisible();
  });

  test("formulario de nueva notificación muestra los tres modos de destinatario", async ({
    page,
  }) => {
    await page.goto("/admin/notifications/new");
    await expect(page.getByRole("button", { name: "Por rol" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Por curso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Usuario individual" })).toBeVisible();
  });

  test("cambiar modo de destinatario actualiza el select", async ({ page }) => {
    await page.goto("/admin/notifications/new");

    // Por defecto: rol — el selector de rol está visible
    await expect(page.getByRole("button", { name: "Por rol" })).toBeVisible();

    // Cambiar a curso
    await page.getByRole("button", { name: "Por curso" }).click();
    await expect(page.getByLabel("Curso")).toBeVisible();

    // Cambiar a usuario
    await page.getByRole("button", { name: "Usuario individual" }).click();
    await expect(page.getByLabel("Usuario")).toBeVisible();
  });

  test("tipo de notificación tiene default en General", async ({ page }) => {
    await page.goto("/admin/notifications/new");
    await expect(page.getByLabel("Tipo")).toHaveValue("general");
  });

  test("campos de título y mensaje tienen maxLength", async ({ page }) => {
    await page.goto("/admin/notifications/new");
    const title = page.getByLabel("Título");
    const body = page.getByLabel("Mensaje");
    expect(await title.getAttribute("maxlength")).toBe("100");
    expect(await body.getAttribute("maxlength")).toBe("500");
  });
});

test.describe("Reclamos", () => {
  test("listado de reclamos carga correctamente", async ({ page }) => {
    await page.goto("/admin/complaints");
    await expect(page.getByRole("heading", { name: "Reclamos" })).toBeVisible();
  });

  test("formulario de reclamo muestra banner de 48hs destacado", async () => {
    test.skip(true, "/admin/complaints/new no existe — reclamos se crean desde el listado admin");
  });

  test("descripción tiene minLength de 20 y maxLength de 1000", async () => {
    test.skip(true, "/admin/complaints/new no existe — reclamos se crean desde el listado admin");
  });
});
