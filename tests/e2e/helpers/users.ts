/**
 * Usuarios de prueba y credenciales compartidas por toda la suite E2E.
 * Deben coincidir con lo que crea scripts/seed-e2e.ts.
 */
export const TEST_PASSWORD = "E2e-Test-2026!";

export type Role = "director" | "administrativo" | "profesor" | "alumno";

export const TEST_USERS: Record<Role, { email: string; storageState: string }> = {
  director: { email: "director@e2e.test", storageState: "tests/e2e/.auth/director.json" },
  administrativo: { email: "administrativo@e2e.test", storageState: "tests/e2e/.auth/administrativo.json" },
  profesor: { email: "profesor@e2e.test", storageState: "tests/e2e/.auth/profesor.json" },
  alumno: { email: "alumno@e2e.test", storageState: "tests/e2e/.auth/alumno.json" },
};

/** Ruta "home" de cada rol tras el login. */
export const ROLE_HOME: Record<Role, string> = {
  director: "/director",
  administrativo: "/administrativo",
  profesor: "/profesor",
  alumno: "/alumno",
};
