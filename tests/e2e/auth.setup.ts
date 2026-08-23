import { test as setup } from "@playwright/test";
import path from "path";
import { TEST_PASSWORD, TEST_USERS, type Role } from "./helpers/users";

/**
 * Autentica una vez por rol y guarda el storageState en tests/e2e/.auth/<rol>.json.
 * Los proyectos de playwright.config.ts reutilizan ese estado para no loguear en
 * cada test.
 */
async function login(role: Role, page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.getByLabel("Email");
  await emailInput.waitFor({ state: "visible", timeout: 30_000 });
  await emailInput.fill(TEST_USERS[role].email);

  const passwordInput = page.locator("#password");
  await passwordInput.waitFor({ state: "visible", timeout: 30_000 });
  await passwordInput.fill(TEST_PASSWORD);

  await page.getByRole("button", { name: "Ingresar" }).click();

  // La URL deja de ser /login cuando el login prospera (cualquier home de rol).
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 60_000 });
  await page.waitForLoadState("networkidle");

  await page.context().storageState({
    path: path.join(__dirname, "..", "..", TEST_USERS[role].storageState),
  });
}

for (const role of Object.keys(TEST_USERS) as Role[]) {
  setup(`autenticar como ${role}`, async ({ page }) => {
    await login(role, page);
  });
}
