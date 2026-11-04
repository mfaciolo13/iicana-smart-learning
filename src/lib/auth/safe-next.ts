/**
 * Destino al que volver después de iniciar sesión (?next=). Solo se acepta una ruta interna del
 * portal del propio rol: nunca una URL externa (open redirect) ni una de otro portal.
 */
export function safeNextPath(next: unknown, role: string): string | null {
  if (typeof next !== "string" || next.length === 0 || next.length > 500) return null;
  // Debe ser una ruta absoluta del sitio ("/alumno/payments"), no "//evil.com", "/\evil.com" ni "https://...".
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u001f]/.test(next)) return null;
  const base = `/${role}`;
  if (next !== base && !next.startsWith(`${base}/`) && !next.startsWith(`${base}?`)) return null;
  return next;
}
