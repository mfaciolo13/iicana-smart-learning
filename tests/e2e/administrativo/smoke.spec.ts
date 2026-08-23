import { test } from "@playwright/test";
import { ROLE_ROUTES, ADMIN_ONLY_ROUTES } from "../helpers/routes";
import { expectRouteLoads, expectForbidden } from "../helpers/smoke";

test.describe("Administrativo · smoke de carga de rutas", () => {
  for (const route of ROLE_ROUTES.administrativo) {
    test(`carga ${route}`, async ({ page }) => {
      await expectRouteLoads(page, route);
    });
  }
});

test.describe("Administrativo · rutas exclusivas de dirección → 403", () => {
  // Contrato explícito de src/proxy.ts (ADMIN_ONLY_ROUTES).
  for (const route of ADMIN_ONLY_ROUTES) {
    test(`${route} devuelve 403`, async ({ page }) => {
      await expectForbidden(page, route);
    });
  }
});
