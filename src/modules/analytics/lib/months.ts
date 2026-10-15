import { todayInstitute } from "@/lib/validation";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface MonthSlot {
  /** "2026-10" */
  key: string;
  /** "oct" (con el año de dos cifras si cruza de año: "dic 25") */
  label: string;
}

/** Últimos `n` meses (el actual incluido), en hora del instituto, del más viejo al más nuevo. */
export function lastMonths(n: number, today: string = todayInstitute()): MonthSlot[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)); // 1-12
  const slots: MonthSlot[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const index = month - 1 - i; // puede ser negativo
    const y = year + Math.floor(index / 12);
    const m = ((index % 12) + 12) % 12;
    slots.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: y === year ? MONTH_LABELS[m] : `${MONTH_LABELS[m]} ${String(y).slice(2)}`,
    });
  }
  return slots;
}

/** Primer día del mes más viejo de la ventana, para filtrar en SQL ("2026-05-01"). */
export function windowStart(n: number, today: string = todayInstitute()): string {
  return `${lastMonths(n, today)[0].key}-01`;
}

/**
 * Completa una serie mensual: devuelve un punto por cada mes de la ventana, con 0 (o null)
 * donde la consulta no devolvió filas.
 */
export function fillMonths<T extends { m: string }, K extends string>(
  months: MonthSlot[],
  rows: T[],
  fields: K[],
  empty: number | null = 0
): Array<{ mes: string } & Record<K, number | null>> {
  const byMonth = new Map(rows.map((r) => [r.m, r]));
  return months.map((slot) => {
    const row = byMonth.get(slot.key) as Record<string, unknown> | undefined;
    const point = { mes: slot.label } as { mes: string } & Record<K, number | null>;
    for (const f of fields) {
      const v = row?.[f];
      (point as Record<string, number | null>)[f] = v === undefined || v === null ? empty : Number(v);
    }
    return point;
  });
}
