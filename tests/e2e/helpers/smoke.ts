import { expect, type Page } from "@playwright/test";

/**
 * Abre una ruta y verifica que cargó sin error y sin ser expulsado:
 *  - no rebotó a /login (sesión perdida) ni a /403 (sin permiso)
 *  - no muestra el overlay de error de Next / crash de la página
 */
export async function expectRouteLoads(page: Page, route: string) {
  const res = await page.goto(route);
  await page.waitForLoadState("domcontentloaded");

  expect(res?.status(), `HTTP status de ${route}`).toBeLessThan(400);

  const url = new URL(page.url());
  expect(url.pathname, `${route} no debería redirigir a /login`).not.toBe("/login");
  expect(url.pathname, `${route} no debería redirigir a /403`).not.toBe("/403");

  await expect(
    page.getByText(/Application error|Unhandled Runtime Error|Internal Server Error/i),
    `${route} no debería mostrar un error de runtime`,
  ).toHaveCount(0);
}

/** Verifica que la ruta expulsa al usuario a /403 (sin permiso). */
export async function expectForbidden(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/\/403/, { timeout: 15_000 });
}

/**
 * Verifica el AISLAMIENTO de portal: un rol NO debería poder ver el contenido
 * de un portal ajeno. Los layouts por portal hacen redirect(`/${role}`) del
 * lado del servidor, así que "bloqueado" significa que la URL final NO quedó en
 * la ruta ajena: fue expulsado a su propia home, a /403 o a /login.
 *
 * @param foreignPrefix prefijo del portal ajeno (p. ej. "/director")
 * @param ownHome home del rol actual (p. ej. "/profesor")
 */
export async function expectNotOwnPortal(
  page: Page,
  route: string,
  foreignPrefix: string,
  ownHome: string,
) {
  await page.goto(route);
  await page.waitForLoadState("domcontentloaded");
  // El redirect server-side puede resolverse en un tick — damos margen.
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .not.toContain(`${foreignPrefix}/`);

  const pathname = new URL(page.url()).pathname;
  const blocked =
    pathname === "/403" ||
    pathname === "/login" ||
    pathname === ownHome ||
    pathname.startsWith(`${ownHome}/`);
  expect(
    blocked,
    `${route}: se esperaba redirect a ${ownHome} / 403 / login, pero quedó en ${pathname}`,
  ).toBe(true);
}
