import { fromCents, mulBps, percentToBps, toCents } from "@/lib/money";

/**
 * Aumentos trimestrales de cuotas: matemática y calendario puros (sin base de datos), para poder
 * probarlos a fondo. La aplicación sobre las cuotas está en services/fee-increases.service.ts.
 */

export interface PriceSet {
  list: string;
  transfer: string | null;
  cash: string | null;
}

/** Nuevo = anterior × (1 + porcentaje / 100), redondeado mitad hacia arriba a centavos. */
export function increaseCents(cents: number, percentage: number): number {
  return cents + mulBps(cents, percentToBps(percentage));
}

/**
 * Aplica el aumento a los tres precios de una cuota. Los precios con descuento que no existen
 * (null) se mantienen null: seguirán derivándose del nuevo precio de lista con los porcentajes
 * generales. Los que sí existen se escalan con el mismo porcentaje, así cada alumno conserva su
 * propia relación entre lista, transferencia y efectivo.
 */
export function applyIncrease(prices: PriceSet, percentage: number): PriceSet {
  const scale = (v: string | null) => (v == null ? null : fromCents(increaseCents(toCents(v), percentage)));
  return { list: scale(prices.list)!, transfer: scale(prices.transfer), cash: scale(prices.cash) };
}

// ─── Trimestres ─────────────────────────────────────────────────────────────

const QUARTER_RE = /^(\d{4})-Q([1-4])$/;

export function isValidQuarter(q: string): boolean {
  return QUARTER_RE.test(q);
}

/** "2026-Q4" → { start: "2026-10-01", end: "2026-12-31" } (trimestres calendario). */
export function quarterRange(quarter: string): { start: string; end: string } {
  const m = QUARTER_RE.exec(quarter);
  if (!m) throw new Error(`Trimestre inválido: ${quarter}`);
  const year = Number(m[1]);
  const q = Number(m[2]);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(year, endMonth, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { start: `${year}-${pad(startMonth)}-01`, end: `${year}-${pad(endMonth)}-${pad(lastDay)}` };
}

/** Trimestre al que pertenece una fecha YYYY-MM-DD. */
export function quarterOf(isoDate: string): string {
  const year = isoDate.slice(0, 4);
  const month = Number(isoDate.slice(5, 7));
  return `${year}-Q${Math.floor((month - 1) / 3) + 1}`;
}

/** Los próximos `count` trimestres a partir del de `today` (inclusive). */
export function upcomingQuarters(today: string, count = 8): string[] {
  let year = Number(today.slice(0, 4));
  let q = Number(quarterOf(today).slice(-1));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${year}-Q${q}`);
    q++;
    if (q > 4) {
      q = 1;
      year++;
    }
  }
  return out;
}

export function quarterLabel(quarter: string): string {
  const m = QUARTER_RE.exec(quarter);
  if (!m) return quarter;
  const { start, end } = quarterRange(quarter);
  const month = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("es-AR", { month: "long", timeZone: "UTC" });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${m[2]}.º trimestre ${m[1]} (${cap(month(start))} a ${month(end)})`;
}

export interface IncreaseInput {
  percentage: number;
  quarter: string;
  effectiveDate: string;
}

/** Validaciones de negocio de un aumento; devuelve el primer problema o null. */
export function validateIncrease(input: IncreaseInput, today: string): string | null {
  if (!Number.isFinite(input.percentage)) return "El porcentaje debe ser un número";
  if (input.percentage < 0) return "El porcentaje no puede ser negativo";
  if (input.percentage > 1000) return "El porcentaje es demasiado alto";
  if (Math.round(input.percentage * 100) / 100 !== input.percentage) return "El porcentaje admite hasta 2 decimales";
  if (!isValidQuarter(input.quarter)) return "Elegí un trimestre válido";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveDate) || Number.isNaN(new Date(`${input.effectiveDate}T12:00:00Z`).getTime())) {
    return "La fecha de entrada en vigencia no es válida";
  }
  const { start, end } = quarterRange(input.quarter);
  if (input.effectiveDate < start || input.effectiveDate > end) return "La fecha de vigencia debe estar dentro del trimestre elegido";
  if (input.effectiveDate <= today) return "La fecha de vigencia debe ser posterior a hoy: un aumento no se aplica con fecha pasada";
  return null;
}
