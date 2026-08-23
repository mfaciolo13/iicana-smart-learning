import { test } from "@playwright/test";
import { ROLE_ROUTES } from "../helpers/routes";
import { expectRouteLoads } from "../helpers/smoke";

test.describe("Director · smoke de carga de rutas", () => {
  for (const route of ROLE_ROUTES.director) {
    test(`carga ${route}`, async ({ page }) => {
      await expectRouteLoads(page, route);
    });
  }
});
