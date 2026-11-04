import { fromCents, mulBps, percentOf, percentToBps, toCents } from "@/lib/money";

export type PaymentMethodKey = "cash" | "transfer" | "card";

/** Política económica configurable (tabla app_settings, clave `payments.rates`). */
export interface PricingRates {
  /** Descuento por transferencia cuando la cuota no trae precio propio, en %. */
  transferDiscountPct: number;
  /** Descuento por efectivo cuando la cuota no trae precio propio, en %. */
  cashDiscountPct: number;
  /** Recargo de tarjeta sobre el precio de LISTA, en %. */
  cardSurchargePct: number;
  /** Último día del mes (inclusive) en que rigen los descuentos. */
  discountLastDay: number;
}

export const DEFAULT_RATES: PricingRates = {
  transferDiscountPct: 5,
  cashDiscountPct: 10,
  cardSurchargePct: 5,
  discountLastDay: 10,
};

export interface FeePrices {
  listPrice: string | number;
  /** Precio individual con descuento por transferencia; si falta se deriva de la tasa por defecto. */
  transferPrice?: string | number | null;
  /** Precio individual con descuento por efectivo; si falta se deriva de la tasa por defecto. */
  cashPrice?: string | number | null;
  /** Último día (YYYY-MM-DD) en que la cuota admite descuento. Null = sin tope propio. */
  discountValidUntil?: string | null;
}

export type PriceKind = "list" | "transfer_discount" | "cash_discount" | "card_surcharge";

export interface PriceQuote {
  method: PaymentMethodKey;
  /** Regía algún descuento a la fecha de cálculo (aunque el método elegido no lo use). */
  discountsActive: boolean;
  kind: PriceKind;
  listCents: number;
  discountCents: number;
  /** Porcentaje de descuento calculado: (lista − final) / lista × 100, 2 decimales. */
  discountPct: number;
  surchargeCents: number;
  surchargePct: number;
  finalCents: number;
}

/** Strings listos para guardar en columnas numeric. */
export function quoteToColumns(q: PriceQuote) {
  return {
    listPriceSnapshot: fromCents(q.listCents),
    discountAmount: fromCents(q.discountCents),
    discountPercentage: q.discountPct.toFixed(2),
    surchargeAmount: fromCents(q.surchargeCents),
    finalAmount: fromCents(q.finalCents),
  };
}

function dayOf(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/**
 * ¿Rigen los descuentos en `onDate` (fecha local del instituto, YYYY-MM-DD)?
 *
 * Reglas: del día 1 al `discountLastDay` inclusive del mes calendario; y además la cuota no puede
 * haber superado su propio tope (`discountValidUntil`), para que una cuota de marzo no recupere el
 * descuento por pagarse el 5 de abril. Fuera de eso, precio de lista.
 */
export function discountsActive(onDate: string, rates: PricingRates, discountValidUntil?: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(onDate)) throw new Error(`Fecha inválida: ${onDate}`);
  if (dayOf(onDate) > rates.discountLastDay) return false;
  if (discountValidUntil && onDate > discountValidUntil) return false;
  return true;
}

/** Precio con descuento por transferencia, en centavos (individual o derivado de la tasa). */
export function transferPriceCents(prices: FeePrices, rates: PricingRates): number {
  const list = toCents(prices.listPrice);
  if (prices.transferPrice != null && prices.transferPrice !== "") return Math.min(toCents(prices.transferPrice), list);
  return list - mulBps(list, percentToBps(rates.transferDiscountPct));
}

/** Precio con descuento por efectivo, en centavos (individual o derivado de la tasa). */
export function cashPriceCents(prices: FeePrices, rates: PricingRates): number {
  const list = toCents(prices.listPrice);
  if (prices.cashPrice != null && prices.cashPrice !== "") return Math.min(toCents(prices.cashPrice), list);
  return list - mulBps(list, percentToBps(rates.cashDiscountPct));
}

/**
 * Calcula el importe de una cuota para un medio de pago en una fecha. Es la ÚNICA fuente de
 * verdad: el servidor la usa para cobrar y la interfaz solo muestra su resultado.
 *
 * - Transferencia / efectivo: precio con descuento si rigen los descuentos; si no, lista.
 * - Tarjeta: lista + recargo, siempre, calculado sobre la lista (nunca sobre un precio con descuento).
 */
export function quotePayment(
  prices: FeePrices,
  method: PaymentMethodKey,
  onDate: string,
  rates: PricingRates = DEFAULT_RATES,
): PriceQuote {
  const listCents = toCents(prices.listPrice);
  if (listCents <= 0) throw new Error("El precio de lista debe ser mayor a 0");
  const active = discountsActive(onDate, rates, prices.discountValidUntil);

  if (method === "card") {
    const surchargeCents = mulBps(listCents, percentToBps(rates.cardSurchargePct));
    return {
      method,
      discountsActive: active,
      kind: "card_surcharge",
      listCents,
      discountCents: 0,
      discountPct: 0,
      surchargeCents,
      surchargePct: percentOf(surchargeCents, listCents),
      finalCents: listCents + surchargeCents,
    };
  }

  const discounted = method === "transfer" ? transferPriceCents(prices, rates) : cashPriceCents(prices, rates);
  const finalCents = active ? discounted : listCents;
  const discountCents = listCents - finalCents;
  return {
    method,
    discountsActive: active,
    kind: discountCents > 0 ? (method === "transfer" ? "transfer_discount" : "cash_discount") : "list",
    listCents,
    discountCents,
    discountPct: percentOf(discountCents, listCents),
    surchargeCents: 0,
    surchargePct: 0,
    finalCents,
  };
}

/** Cotizaciones de los tres medios, para mostrar el cuadro completo de una cuota. */
export function quoteAllMethods(prices: FeePrices, onDate: string, rates: PricingRates = DEFAULT_RATES) {
  return {
    transfer: quotePayment(prices, "transfer", onDate, rates),
    cash: quotePayment(prices, "cash", onDate, rates),
    card: quotePayment(prices, "card", onDate, rates),
  } satisfies Record<PaymentMethodKey, PriceQuote>;
}

/** Período "YYYY-MM" de una fecha de vencimiento. */
export function periodOf(dueDate: string): string {
  return dueDate.slice(0, 7);
}

/** Tope de descuento por defecto de una cuota: el último día de descuento de su mes. */
export function defaultDiscountValidUntil(dueDate: string, rates: PricingRates = DEFAULT_RATES): string {
  return `${periodOf(dueDate)}-${String(rates.discountLastDay).padStart(2, "0")}`;
}

export const METHOD_LABELS: Record<PaymentMethodKey, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta de crédito",
};
