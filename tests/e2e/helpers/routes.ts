import type { Role } from "./users";

/**
 * Rutas "índice" (listados / dashboards) de cada portal. Se usan para el smoke
 * de carga: cada rol debe poder abrir TODAS las suyas sin error.
 * No se incluyen rutas con [id] dinámico — esas se cubren en los flujos CRUD.
 */
export const ROLE_ROUTES: Record<Role, string[]> = {
  director: [
    "/director",
    "/director/students",
    "/director/teachers",
    "/director/courses",
    "/director/enrollments",
    "/director/attendance",
    "/director/grades",
    "/director/payments",
    "/director/complaints",
    "/director/notifications",
    "/director/assessments",
    "/director/documents",
    "/director/marketing",
    "/director/teacher-evaluations",
    "/director/promotions",
    "/director/year-end",
    "/director/risk",
    "/director/reports",
    "/director/users",
    "/director/settings/notifications",
    "/director/settings/automations",
    "/director/profile",
  ],
  administrativo: [
    "/administrativo",
    "/administrativo/students",
    "/administrativo/enrollments",
    "/administrativo/attendance",
    "/administrativo/grades",
    "/administrativo/payments",
    "/administrativo/complaints",
    "/administrativo/notifications",
    "/administrativo/reports",
    "/administrativo/profile",
  ],
  profesor: [
    "/profesor",
    "/profesor/attendance",
    "/profesor/grades",
    "/profesor/assessments",
    "/profesor/documents",
    "/profesor/notifications",
    "/profesor/profile",
  ],
  alumno: [
    "/alumno",
    "/alumno/attendance",
    "/alumno/grades",
    "/alumno/payments",
    "/alumno/complaints",
    "/alumno/notifications",
    "/alumno/evaluations",
    "/alumno/assessments",
    "/alumno/documents",
    "/alumno/profile",
  ],
};

/**
 * Rutas de /director exclusivas del director de las que el rol 'administrativo'
 * es explícitamente expulsado a /403 (fuente: src/lib/auth/route-access.ts; el proxy usa una lista blanca).
 */
export const ADMIN_ONLY_ROUTES = [
  "/director/users",
  "/director/teachers",
  "/director/courses",
  "/director/teacher-evaluations",
  "/director/assessments",
  "/director/year-end",
  "/director/marketing",
  "/director/promotions",
  "/director/settings/notifications",
];
