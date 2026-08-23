import { test, expect } from "@playwright/test";

const SEED_DNI = "40111222"; // Alumno E2E (tiene pagos sembrados)

let seq = 0;
function mkStudent(tag: string) {
  seq += 1;
  const dni = (String(Date.now()).slice(-7) + String(seq)).slice(-8); // 8 dígitos, solo números
  return { fullName: `Pago ${tag}`, dni, email: `pago-${dni}@e2e.test` };
}

async function createStudent(page: import("@playwright/test").Page, st: { fullName: string; dni: string; email: string }) {
  await page.goto("/director/students/new");
  await page.locator("#fullName").fill(st.fullName);
  await page.locator("#dni").fill(st.dni);
  await page.locator("#email").fill(st.email);
  await page.locator("#birthDate").fill("2005-06-15");
  await page.locator("#level").selectOption("intermediate");
  await page.getByRole("button", { name: "Registrar alumno" }).click();
  await page.waitForURL(/\/director\/students$/, { timeout: 30_000 });
}

async function selectStudentByDni(page: import("@playwright/test").Page, dni: string) {
  const value = await page.locator("#studentId option", { hasText: dni }).first().getAttribute("value");
  if (!value) throw new Error(`Alumno con DNI ${dni} no está en el select`);
  await page.locator("#studentId").selectOption(value);
}

async function createPaymentFor(page: import("@playwright/test").Page, st: { fullName: string; dni: string }) {
  await page.goto("/director/payments/new");
  await page.waitForLoadState("networkidle"); // esperar hidratación de RHF antes de seleccionar
  // Nombre sin dígitos → el label es exacto y estable.
  await page.locator("#studentId").selectOption({ label: `${st.fullName} — ${st.dni}` });
  await page.locator("#amount").fill("15000");
  await page.getByRole("button", { name: "Registrar pago" }).click();
  // createPaymentAction redirige al DETALLE del pago, no a la lista.
  await page.waitForURL(/\/director\/payments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
}

test.describe("Director · Pagos · listado", () => {
  test("el listado muestra el pago sembrado", async ({ page }) => {
    await page.goto("/director/payments");
    await expect(page.getByRole("heading", { name: "Pagos" })).toBeVisible();
    await expect(page.getByRole("cell", { name: new RegExp(SEED_DNI) }).first()).toBeVisible();
  });
});

test.describe("Director · Pagos · validaciones (casos borde)", () => {
  test("monto <= 0 muestra error y no navega", async ({ page }) => {
    await page.goto("/director/payments/new");
    await selectStudentByDni(page, SEED_DNI);
    await page.locator("#amount").fill("0");
    await page.getByRole("button", { name: "Registrar pago" }).click();
    await expect(page.getByText(/mayor a 0/i)).toBeVisible();
    await expect(page).toHaveURL(/\/director\/payments\/new/);
  });
});

test.describe("Director · Pagos · marcar como pagado", () => {
  test.describe.configure({ mode: "serial" });
  const st = mkStudent("MP");

  test("registrar un pago para un alumno nuevo", async ({ page }) => {
    await createStudent(page, st);
    await createPaymentFor(page, st);
    // createPaymentFor ya esperó la URL del detalle (solo se llega si el pago se creó).
    await expect(page.getByRole("heading", { name: "Detalle del pago" })).toBeVisible({ timeout: 20_000 });
  });

  test("marcar el pago como pagado genera el estado Pagado y el recibo", async ({ page }) => {
    await page.goto("/director/payments");
    await page.locator("tr", { hasText: st.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/payments\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await page.locator("#method").selectOption("cash");
    await page.getByRole("button", { name: "Confirmar pago" }).click();
    await expect(page.getByText("Pagado").first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("link", { name: /Ver recibo/i })).toBeVisible();
  });
});

test.describe("Director · Pagos · anular", () => {
  test.describe.configure({ mode: "serial" });
  const st = mkStudent("CN");

  test("registrar un pago para anular", async ({ page }) => {
    await createStudent(page, st);
    await createPaymentFor(page, st);
    // createPaymentFor ya esperó la URL del detalle (solo se llega si el pago se creó).
    await expect(page.getByRole("heading", { name: "Detalle del pago" })).toBeVisible({ timeout: 20_000 });
  });

  test("anular con motivo corto es rechazado; con motivo válido queda Anulado", async ({ page }) => {
    await page.goto("/director/payments");
    await page.locator("tr", { hasText: st.dni }).getByRole("link").first().click();
    await page.waitForURL(/\/director\/payments\/[0-9a-f-]{36}$/, { timeout: 30_000 });

    await page.getByRole("button", { name: "Anular pago" }).click();
    // Motivo corto (<10) → error de servidor (toast).
    await page.locator("#reason").fill("corto");
    await page.getByRole("button", { name: "Confirmar anulación" }).click();
    await expect(page.locator("[data-sonner-toast]", { hasText: /motivo|mínimo 10/i })).toBeVisible({ timeout: 20_000 });

    // Motivo válido → pago Anulado.
    await page.locator("#reason").fill("Cuota duplicada por error de carga administrativa");
    await page.getByRole("button", { name: "Confirmar anulación" }).click();
    await expect(page.getByText("Anulado").first()).toBeVisible({ timeout: 20_000 });
  });
});
