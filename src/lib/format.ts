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

/** Zona horaria del instituto (Córdoba). Vercel corre en UTC: toda fecha/hora "de hoy" se calcula acá. */
export const INSTITUTE_TZ = "America/Argentina/Cordoba";

/** Hora (0-23) actual en la zona horaria del instituto. */
export function hourInstitute(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: INSTITUTE_TZ }).format(now),
  );
}

/** Fecha (YYYY-MM-DD) de hoy +/- `days` días en la zona horaria del instituto. */
export function addDaysInstitute(days: number, now: Date = new Date()): string {
  const [y, m, d] = now.toLocaleDateString("en-CA", { timeZone: INSTITUTE_TZ }).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function formatMoneyAR(amount: string | number | null | undefined): string {
  const n = typeof amount === "number" ? amount : parseFloat(amount ?? "0");
  return `$${(Number.isFinite(n) ? n : 0).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
