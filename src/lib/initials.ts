/** Iniciales de las primeras dos palabras, ignorando espacios adicionales. */
export function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
}
