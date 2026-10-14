/**
 * Formato de fechas "sólo día" (YYYY-MM-DD) y montos para es-AR.
 * Las fechas de la base no se pasan por `new Date()`: con una cadena ISO sin hora se interpreta
 * como UTC y en Argentina se mostraba el día anterior (SCRUM-260).
 */
export function formatDateAR(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoDate;
}

export function formatMoneyAR(amount: string | number | null | undefined): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? "0");
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
