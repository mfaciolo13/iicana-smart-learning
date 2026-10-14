/** Minúsculas y sin acentos, para que "nandu" encuentre "Ñandú" (SCRUM-273). */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** true si el texto contiene la consulta, ignorando acentos y mayúsculas. */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  return normalizeSearch(text ?? "").includes(normalizeSearch(query));
}
