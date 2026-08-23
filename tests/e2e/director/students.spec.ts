import { test, expect } from "@playwright/test";

// Datos únicos por corrida para no colisionar con el seed ni entre reintentos.
const stamp = Date.now();
const NEW = {
  fullName: `Alumno CRUD ${stamp}`,
  dni: String(stamp).slice(-8),
  email: `alumno-crud-${stamp}@e2e.test`,
  birthDate: "2005-06-15",
};
const SEED_DNI = "40111222"; // del seed (Alumno E2E)

async function fillNewStudent(
  page: import("@playwright/test").Page,
  data: { fullName: string; dni: string; email: string; birthDate: string; level?: string },
) {
  await page.locator("#fullName").fill(data.fullName);
  await page.locator("#dni").fill(data.dni);
  await page.locator("#email").fill(data.email);
  await page.locator("#birthDate").fill(data.birthDate);
  if (data.level) await page.locator("#level").selectOption(data.level);
}

test.describe("Director · Alumnos · listado y detalle", () => {
  test("el listado muestra el alumno sembrado", async ({ page }) => {
    await page.goto("/director/students");
    await expect(page.getByRole("heading", { name: "Alumnos" })).toBeVisible();
    await expect(page.getByRole("cell", { name: SEED_DNI, exact: true }).first()).toBeVisible();
  });

  test("el detalle del alumno carga sin colgarse (Promise.all de 3 queries Drizzle)", async ({ page }) => {
    // Creamos un alumno por UI (la mutación revalida el cache → id consistente) y
    // abrimos SU detalle. Verifica empíricamente que el Promise.all sobre el
    // cliente Drizzle max:1 NO se cuelga.
    const s = String(Date.now()).slice(-8);
    await page.goto("/director/students/new");
    await fillNewStudent(page, {
      fullName: `Detalle ${s}`, dni: s, email: `detalle-${s}@e2e.test`, birthDate: "2005-06-15", level: "intermediate",
    });
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await page.waitForURL(/\/director\/students$/, { timeout: 30_000 });

    await page.locator("tr", { hasText: s }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/students\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Inscripciones" })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("heading", { name: "Pagos" })).toBeVisible();
    await expect(page.getByText(s, { exact: true }).first()).toBeVisible();
  });
});

test.describe("Director · Alumnos · validaciones (casos borde)", () => {
  test("submit vacío bloquea el envío y no navega", async ({ page }) => {
    await page.goto("/director/students/new");
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await expect(page).toHaveURL(/\/director\/students\/new/);
    await expect(page.getByText(/al menos 2 caracteres|requerid|inválid/i).first()).toBeVisible();
  });

  test("DNI con formato inválido muestra error inline", async ({ page }) => {
    await page.goto("/director/students/new");
    await fillNewStudent(page, { fullName: "Test Borde", dni: "123", email: `borde-${stamp}@e2e.test`, birthDate: "2005-06-15" });
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await expect(page.getByText(/DNI debe contener solo números/i)).toBeVisible();
    await expect(page).toHaveURL(/\/director\/students\/new/);
  });

  test("DNI duplicado es rechazado por el servidor con toast de error", async ({ page }) => {
    await page.goto("/director/students/new");
    // Nivel asignado para evitar el bloqueo silencioso de BUG-C y llegar al server.
    await fillNewStudent(page, { fullName: "Duplicado DNI", dni: SEED_DNI, email: `dup-${stamp}@e2e.test`, birthDate: "2005-06-15", level: "intermediate" });
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    // El server rechaza el duplicado y muestra el toast de error (feedback funciona).
    await expect(
      page.locator("[data-sonner-toast]", { hasText: /Ya existe un alumno registrado con ese DNI/i }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/director\/students\/new/);
  });

  // BUG-C — dejar "Nivel" sin asignar (default "Sin asignar") bloquea el submit
  // en SILENCIO: level="" no pasa el enum Zod client-side, `.optional()` no acepta
  // "", y ese Field no muestra error. Como el nivel es OPCIONAL, el alta debería
  // funcionar sin nivel. Se espera que falle hasta arreglarlo.
  test.fail("BUG-C: crear alumno sin asignar nivel se bloquea en silencio", async ({ page }) => {
    const s = String(Date.now()).slice(-8);
    await page.goto("/director/students/new");
    await fillNewStudent(page, {
      fullName: `Sin Nivel ${s}`,
      dni: s,
      email: `sinnivel-${s}@e2e.test`,
      birthDate: "2005-06-15",
      // level: intencionalmente NO se asigna
    });
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    // Nivel es opcional → debería crear y redirigir a la lista. Hoy no lo hace.
    await page.waitForURL(/\/director\/students$/, { timeout: 15_000 });
  });
});

test.describe("Director · Alumnos · ciclo completo crear → editar → eliminar", () => {
  test.describe.configure({ mode: "serial" });

  test("crear alumno", async ({ page }) => {
    await page.goto("/director/students/new");
    await fillNewStudent(page, { ...NEW, level: "intermediate" });
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await page.waitForURL(/\/director\/students$/, { timeout: 30_000 });
    await expect(page.getByRole("cell", { name: NEW.dni, exact: true }).first()).toBeVisible({ timeout: 20_000 });
  });

  test("editar alumno (cambiar nivel a Avanzado)", async ({ page }) => {
    await page.goto("/director/students");
    await page.locator("tr", { hasText: NEW.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/students\/[0-9a-f-]{36}$/);
    await page.getByRole("link", { name: "Editar" }).click();
    await page.waitForURL(/\/edit$/);
    await page.locator("#level").selectOption("advanced");
    await page.getByRole("button", { name: /Guardar|Actualizar/ }).click();
    await page.waitForURL(/\/director\/students\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByText("Avanzado")).toBeVisible({ timeout: 20_000 });
  });

  test("eliminar alumno (el registro se borra correctamente)", async ({ page }) => {
    await page.goto("/director/students");
    await page.locator("tr", { hasText: NEW.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/students\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    // Esperar a que el borrado complete: por BUG-A el detalle pasa a 404.
    await expect(page.getByText(/Página no encontrada/i)).toBeVisible({ timeout: 30_000 });
    // Verificar que ya no está en la lista (la action revalida el tag "students").
    await page.goto("/director/students");
    await expect(page.getByRole("cell", { name: NEW.dni, exact: true })).toHaveCount(0);
  });
});

// BUG-A — al eliminar desde el detalle, el usuario queda en una página 404 en
// vez de ser redirigido a la lista (el borrado sí ocurre). Se espera que falle
// hasta que se arregle (usar redirect() server-side en la action, p. ej.).
test.describe("Director · Alumnos · bug de navegación post-borrado", () => {
  test.fail("BUG-A: eliminar desde el detalle deja al usuario en 404 en vez de la lista", async ({ page }) => {
    // Crear un alumno descartable para borrarlo desde su detalle.
    const s = String(Date.now()).slice(-8);
    await page.goto("/director/students/new");
    await fillNewStudent(page, {
      fullName: `Borrar Detalle ${s}`,
      dni: s,
      email: `del-${s}@e2e.test`,
      birthDate: "2005-06-15",
    });
    await page.getByRole("button", { name: "Registrar alumno" }).click();
    await page.waitForURL(/\/director\/students$/, { timeout: 30_000 });

    await page.locator("tr", { hasText: s }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/students\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    // Contrato deseado: aterrizar en la lista. Hoy aterriza en /404 → falla.
    await page.waitForURL(/\/director\/students$/, { timeout: 15_000 });
  });
});
