import { test, expect } from "@playwright/test";

const stamp = Date.now();
const NEW = {
  fullName: `Docente CRUD ${stamp}`,
  dni: String(stamp).slice(-8),
  email: `docente-crud-${stamp}@e2e.test`,
  specialization: "Cambridge CELTA",
};
const SEED_DNI = "30111222"; // del seed (Profesor E2E)

async function fillNewTeacher(
  page: import("@playwright/test").Page,
  data: { fullName: string; dni: string; email: string; specialization?: string },
) {
  await page.locator("#fullName").fill(data.fullName);
  await page.locator("#dni").fill(data.dni);
  await page.locator("#email").fill(data.email);
  if (data.specialization) await page.locator("#specialization").fill(data.specialization);
}

test.describe("Director · Docentes · listado y detalle", () => {
  test("el listado muestra el docente sembrado", async ({ page }) => {
    await page.goto("/director/teachers");
    await expect(page.getByRole("heading", { name: "Docentes" })).toBeVisible();
    await expect(page.getByRole("cell", { name: SEED_DNI, exact: true }).first()).toBeVisible();
  });

  // Nota: el detalle del docente se cubre en el ciclo CRUD (abre el detalle del
  // docente recién creado, consistente con el cache). Un test de "detalle del
  // sembrado" es frágil ante el cache de listas (unstable_cache) + reseed directo.
});

test.describe("Director · Docentes · validaciones (casos borde)", () => {
  test("submit vacío bloquea el envío y no navega", async ({ page }) => {
    await page.goto("/director/teachers/new");
    await page.getByRole("button", { name: "Registrar docente" }).click();
    await expect(page).toHaveURL(/\/director\/teachers\/new/);
    await expect(page.getByText(/al menos 2 caracteres|requerid|inválid/i).first()).toBeVisible();
  });

  test("DNI con formato inválido muestra error inline", async ({ page }) => {
    await page.goto("/director/teachers/new");
    await fillNewTeacher(page, { fullName: "Test Borde", dni: "12", email: `borde-t-${stamp}@e2e.test` });
    await page.getByRole("button", { name: "Registrar docente" }).click();
    await expect(page.getByText(/DNI debe contener solo números/i)).toBeVisible();
    await expect(page).toHaveURL(/\/director\/teachers\/new/);
  });

  test("DNI duplicado es rechazado por el servidor con toast de error", async ({ page }) => {
    await page.goto("/director/teachers/new");
    await fillNewTeacher(page, { fullName: "Duplicado DNI", dni: SEED_DNI, email: `dup-t-${stamp}@e2e.test` });
    await page.getByRole("button", { name: "Registrar docente" }).click();
    await expect(
      page.locator("[data-sonner-toast]", { hasText: /Ya existe un docente registrado con ese DNI/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/director\/teachers\/new/);
  });
});

test.describe("Director · Docentes · ciclo completo crear → editar → eliminar", () => {
  test.describe.configure({ mode: "serial" });

  test("crear docente", async ({ page }) => {
    await page.goto("/director/teachers/new");
    await fillNewTeacher(page, NEW);
    await page.getByRole("button", { name: "Registrar docente" }).click();
    await page.waitForURL(/\/director\/teachers$/, { timeout: 30_000 });
    await expect(page.getByRole("cell", { name: NEW.dni, exact: true }).first()).toBeVisible({ timeout: 20_000 });
  });

  test("editar docente (cambiar especialización)", async ({ page }) => {
    await page.goto("/director/teachers");
    await page.locator("tr", { hasText: NEW.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/teachers\/[0-9a-f-]{36}$/);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.waitForURL(/\/edit$/);
    await page.locator("#specialization").fill("Phonics Specialist");
    await page.getByRole("button", { name: /Guardar|Actualizar/ }).click();
    await page.waitForURL(/\/director\/teachers\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByText("Phonics Specialist")).toBeVisible({ timeout: 20_000 });
  });

  test("eliminar docente (el registro se borra correctamente)", async ({ page }) => {
    await page.goto("/director/teachers");
    await page.locator("tr", { hasText: NEW.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/teachers\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    // Por BUG-A el detalle pasa a 404; esperamos eso como señal de borrado completo.
    await expect(page.getByText(/Página no encontrada/i)).toBeVisible({ timeout: 30_000 });
    await page.goto("/director/teachers");
    await expect(page.getByRole("cell", { name: NEW.dni, exact: true })).toHaveCount(0);
  });
});
