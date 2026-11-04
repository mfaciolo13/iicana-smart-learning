/** "2026-11" → "Noviembre 2026". Sin dependencias: se usa en cliente, servidor y correos. */
export function periodLabel(period: string | null | undefined): string {
  if (!period || !/^\d{4}-\d{2}$/.test(period)) return period ?? "—";
  const [y, m] = period.split("-").map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("es-AR", { timeZone: "UTC", month: "long" });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}
