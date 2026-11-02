/**
 * Aritmética de dinero en centavos enteros.
 *
 * Los importes viajan como string decimal ("66500.00") desde/hacia Postgres numeric y se operan
 * como enteros de centavos, así no hay errores de coma flotante y todas las pantallas, registros
 * y comprobantes redondean igual: mitad hacia arriba, a 2 decimales.
 */

/** "66500.5" | 66500.5 → 6650050. Lanza si no es un importe decimal válido (máx. 2 decimales). */
export function toCents(value: string | number): number {
  const text = typeof value === "number" ? String(value) : value.trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);
    throw new Error(`Importe inválido: ${text}`);
  }
  const negative = text.startsWith("-");
  const [whole, frac = ""] = text.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** 6650050 → "66500.50" (formato de Postgres numeric). */
export function fromCents(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const whole = Math.trunc(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/**
 * Aplica un porcentaje expresado en puntos básicos (1% = 100 bps) sobre centavos, con redondeo
 * mitad hacia arriba. `percentToBps(5)` = 500; `percentToBps(5.25)` = 525.
 */
export function mulBps(cents: number, bps: number): number {
  const product = cents * bps;
  const rounded = Math.floor((Math.abs(product) + 5000) / 10000);
  return product < 0 ? -rounded : rounded;
}

/** 5 → 500 · 5.25 → 525. Acepta hasta 2 decimales de porcentaje. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** Porcentaje (con 2 decimales) que representa `part` sobre `whole`. 0 si `whole` es 0. */
export function percentOf(part: number, whole: number): number {
  if (whole === 0) return 0;
  return Math.round((part / whole) * 10000) / 100;
}

/** 7350000 → "$ 73.500,00" (es-AR). */
export function formatCents(cents: number): string {
  const n = cents / 100;
  return `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
