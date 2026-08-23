import { test } from "@playwright/test";
import { ROLE_ROUTES } from "../helpers/routes";
import { expectRouteLoads, expectNotOwnPortal } from "../helpers/smoke";

test.describe("Profesor · smoke de carga de rutas", () => {
  for (const route of ROLE_ROUTES.profesor) {
    test(`carga ${route}`, async ({ page }) => {
      await expectRouteLoads(page, route);
    });
  }
});

// AISLAMIENTO DE PORTAL — un profesor es redirigido a su home al pedir un portal
// ajeno (guard server-side en cada layout de portal: redirect(`/${role}`)).
test.describe("Profesor · aislamiento de portal", () => {
  const cases = [
    { route: "/director/students", foreign: "/director" },
    { route: "/administrativo/students", foreign: "/administrativo" },
    { route: "/alumno/grades", foreign: "/alumno" },
  ];
  for (const { route, foreign } of cases) {
    test(`no puede ver ${route}`, async ({ page }) => {
      await expectNotOwnPortal(page, route, foreign, "/profesor");
    });
  }
});
