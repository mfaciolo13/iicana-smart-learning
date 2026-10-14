/**
 * Pantallas de /director que el rol "administrativo" puede abrir (SCRUM-278).
 * Es una lista blanca: todo lo demás de /director/* es exclusivo de dirección. Hoy sólo el
 * detalle de una nota, al que enlaza el listado del portal administrativo.
 */
const ADMINISTRATIVO_SHARED_DIRECTOR_PREFIXES = ["/director/grades/"];

export type DirectorAccess = { allowed: true } | { allowed: false; redirectTo: string };

/** Decide si un rol puede abrir una ruta de /director/*. */
export function checkDirectorAccess(role: string | null | undefined, pathname: string): DirectorAccess {
  if (role === "director") return { allowed: true };
  if (role === "administrativo") {
    const shared = ADMINISTRATIVO_SHARED_DIRECTOR_PREFIXES.some((p) => pathname.startsWith(p));
    return shared ? { allowed: true } : { allowed: false, redirectTo: "/403" };
  }
  // profesor, alumno o sin perfil: a su propio portal (o al login).
  return { allowed: false, redirectTo: role ? `/${role}` : "/login" };
}
