import type { UserRole } from "@/lib/auth/helpers";

/** Prefijo de URL del portal de cada rol. */
export function portalBase(role: UserRole): string {
  return `/${role}`;
}

/**
 * Ruta dentro del portal del rol. `path` debe empezar con "/" (ej: "/students").
 * Evita que un administrativo, profesor o alumno termine en `/director/...`.
 */
export function portalPath(role: UserRole, path: string): string {
  return `${portalBase(role)}${path}`;
}
