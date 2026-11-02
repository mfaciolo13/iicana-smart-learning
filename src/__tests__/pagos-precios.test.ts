import { describe, it, expect } from "vitest";
import { formatCents, fromCents, mulBps, percentOf, toCents } from "@/lib/money";
import {
  DEFAULT_RATES,
  defaultDiscountValidUntil,
  discountsActive,
  quoteAllMethods,
  quotePayment,
  quoteToColumns,
} from "@/modules/payments/lib/pricing";

const CUOTA_70K = { listPrice: "70000.00", transferPrice: "66500.00", cashPrice: "63000.00" };

describe("money (centavos enteros)", () => {
  it("convierte ida y vuelta sin errores de coma flotante", () => {
    expect(toCents("66500.00")).toBe(6650000);
    expect(toCents("0.10") + toCents("0.20")).toBe(30);
    expect(fromCents(6650050)).toBe("66500.50");
    expect(fromCents(5)).toBe("0.05");
    expect(toCents("-12.5")).toBe(-1250);
  });

  it("rechaza importes con texto o más de 2 decimales", () => {
    expect(() => toCents("12,50")).toThrow();
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("1.234")).toThrow();
  });

  it("redondea mitad hacia arriba", () => {
    // 5% de $0,10 = 0,005 → 1 centavo
    expect(mulBps(10, 500)).toBe(1);
    expect(mulBps(7000000, 500)).toBe(350000);
    expect(mulBps(-10, 500)).toBe(-1);
  });

  it("calcula porcentajes y formatea en es-AR", () => {
    expect(percentOf(350000, 7000000)).toBe(5);
    expect(percentOf(1, 0)).toBe(0);
    expect(formatCents(7350000)).toContain("73.500,00");
  });
});

describe("vigencia de descuentos (días 10 y 11)", () => {
  it("rige del día 1 al 10 inclusive", () => {
    expect(discountsActive("2026-11-01", DEFAULT_RATES)).toBe(true);
    expect(discountsActive("2026-11-10", DEFAULT_RATES)).toBe(true);
  });

  it("el día 11 ya no rige, hasta fin de mes", () => {
    expect(discountsActive("2026-11-11", DEFAULT_RATES)).toBe(false);
    expect(discountsActive("2026-11-30", DEFAULT_RATES)).toBe(false);
    expect(discountsActive("2026-12-31", DEFAULT_RATES)).toBe(false);
  });

  it("una cuota vencida no recupera el descuento por pagarse en los primeros días de otro mes", () => {
    expect(discountsActive("2026-04-05", DEFAULT_RATES, "2026-03-10")).toBe(false);
    expect(discountsActive("2026-03-05", DEFAULT_RATES, "2026-03-10")).toBe(true);
  });

  it("el tope por defecto de la cuota es el último día de descuento de su mes", () => {
    expect(defaultDiscountValidUntil("2026-11-10")).toBe("2026-11-10");
    expect(defaultDiscountValidUntil("2026-02-15")).toBe("2026-02-10");
  });

  it("rechaza fechas con formato inválido", () => {
    expect(() => discountsActive("10/11/2026", DEFAULT_RATES)).toThrow();
  });
});

describe("cotización de una cuota de $70.000", () => {
  it("criterio 1: muestra transferencia $66.500 y efectivo $63.000 con descuento vigente", () => {
    const q = quoteAllMethods(CUOTA_70K, "2026-11-05");
    expect(q.transfer.finalCents).toBe(6650000);
    expect(q.cash.finalCents).toBe(6300000);
  });

  it("criterio 2: el porcentaje se calcula, no se escribe a mano", () => {
    const q = quoteAllMethods(CUOTA_70K, "2026-11-05");
    expect(q.transfer.discountPct).toBe(5);
    expect(q.cash.discountPct).toBe(10);
    const raro = quotePayment({ listPrice: "80000", transferPrice: "75500" }, "transfer", "2026-11-05");
    expect(raro.discountPct).toBe(5.63);
  });

  it("criterio 3: el día 10 todavía se aplican los descuentos", () => {
    const q = quoteAllMethods(CUOTA_70K, "2026-11-10");
    expect(q.transfer.finalCents).toBe(6650000);
    expect(q.cash.finalCents).toBe(6300000);
  });

  it("criterio 4: el día 11 transferencia y efectivo pasan al precio de lista", () => {
    const q = quoteAllMethods(CUOTA_70K, "2026-11-11");
    expect(q.transfer.finalCents).toBe(7000000);
    expect(q.cash.finalCents).toBe(7000000);
    expect(q.transfer.discountPct).toBe(0);
    expect(q.transfer.kind).toBe("list");
  });

  it("criterio 5: tarjeta = lista + 5% sobre la lista, con o sin descuentos vigentes", () => {
    for (const day of ["2026-11-05", "2026-11-10", "2026-11-11", "2026-11-30"]) {
      const card = quotePayment(CUOTA_70K, "card", day);
      expect(card.finalCents).toBe(7350000);
      expect(card.surchargeCents).toBe(350000);
      expect(card.discountCents).toBe(0);
    }
  });

  it("deriva los precios con descuento de las tasas cuando la cuota no trae precios propios", () => {
    const q = quoteAllMethods({ listPrice: "70000" }, "2026-11-05");
    expect(q.transfer.finalCents).toBe(6650000);
    expect(q.cash.finalCents).toBe(6300000);
  });

  it("respeta precios individuales que no siguen la tasa (efectivo $70.000 sobre lista $77.000)", () => {
    const q = quotePayment({ listPrice: "77000", transferPrice: "73150", cashPrice: "70000" }, "cash", "2026-11-05");
    expect(q.finalCents).toBe(7000000);
    expect(q.discountPct).toBe(9.09);
  });

  it("nunca cobra más que la lista por un 'descuento' mal cargado", () => {
    const q = quotePayment({ listPrice: "1000", transferPrice: "1500" }, "transfer", "2026-11-05");
    expect(q.finalCents).toBe(100000);
  });

  it("usa las tasas configuradas por Dirección", () => {
    const rates = { ...DEFAULT_RATES, cardSurchargePct: 8, discountLastDay: 15 };
    expect(quotePayment({ listPrice: "10000" }, "card", "2026-11-20", rates).finalCents).toBe(1080000);
    expect(quotePayment({ listPrice: "10000" }, "cash", "2026-11-15", rates).finalCents).toBe(900000);
    expect(quotePayment({ listPrice: "10000" }, "cash", "2026-11-16", rates).finalCents).toBe(1000000);
  });

  it("rechaza un precio de lista nulo", () => {
    expect(() => quotePayment({ listPrice: "0" }, "cash", "2026-11-05")).toThrow();
  });

  it("devuelve las columnas listas para persistir", () => {
    const cols = quoteToColumns(quotePayment(CUOTA_70K, "card", "2026-11-05"));
    expect(cols).toEqual({
      listPriceSnapshot: "70000.00",
      discountAmount: "0.00",
      discountPercentage: "0.00",
      surchargeAmount: "3500.00",
      finalAmount: "73500.00",
    });
  });
});
