import { test } from "@playwright/test";
import { ROLE_ROUTES } from "../helpers/routes";
import { expectRouteLoads, expectNotOwnPortal } from "../helpers/smoke";

test.describe("Alumno · smoke de carga de rutas", () => {
  for (const route of ROLE_ROUTES.alumno) {
    test(`carga ${route}`, async ({ page }) => {
      await expectRouteLoads(page, route);
    });
  }
});

// AISLAMIENTO DE PORTAL — el alumno es redirigido a su home al pedir un portal
// ajeno (guard server-side en cada layout de portal: redirect(`/${role}`)).
test.describe("Alumno · aislamiento de portal", () => {
  const cases = [
    { route: "/director/students", foreign: "/director" },
    { route: "/administrativo/payments", foreign: "/administrativo" },
    { route: "/profesor/grades", foreign: "/profesor" },
  ];
  for (const { route, foreign } of cases) {
    test(`no puede ver ${route}`, async ({ page }) => {
      await expectNotOwnPortal(page, route, foreign, "/alumno");
    });
  }
});
