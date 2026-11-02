import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyIncrease, increaseCents, quarterLabel, quarterOf, quarterRange, upcomingQuarters, validateIncrease } from "@/modules/payments/lib/increase";
import { quotePayment } from "@/modules/payments/lib/pricing";

describe("fórmula del aumento", () => {
  it("70.000 con 15% pasa a 80.500", () => {
    expect(increaseCents(7000000, 15)).toBe(8050000);
  });

  it("escala lista, transferencia y efectivo con el mismo porcentaje", () => {
    const next = applyIncrease({ list: "70000.00", transfer: "66500.00", cash: "63000.00" }, 15);
    expect(next).toEqual({ list: "80500.00", transfer: "76475.00", cash: "72450.00" });
  });

  it("mantiene en null los precios con descuento que no existen (se derivan de la tasa sobre la nueva lista)", () => {
    const next = applyIncrease({ list: "60000.00", transfer: null, cash: null }, 10);
    expect(next).toEqual({ list: "66000.00", transfer: null, cash: null });
    const q = quotePayment({ listPrice: next.list, transferPrice: next.transfer, cashPrice: next.cash }, "transfer", "2026-11-05");
    expect(q.finalCents).toBe(6270000); // 66.000 − 5%
  });

  it("redondea mitad hacia arriba a centavos", () => {
    expect(increaseCents(1001, 5)).toBe(1051); // 10,01 × 1,05 = 10,5105 → 10,51
    expect(increaseCents(10, 5)).toBe(11); // 0,10 × 1,05 = 0,105 → 0,11
  });

  it("un aumento del 0% no cambia nada", () => {
    expect(applyIncrease({ list: "70000.00", transfer: "66500.00", cash: null }, 0)).toEqual({ list: "70000.00", transfer: "66500.00", cash: null });
  });

  it("el precio con descuento nunca supera al de lista tras el aumento", () => {
    for (const pct of [0, 0.01, 3.33, 15, 99.99]) {
      const n = applyIncrease({ list: "77000.00", transfer: "73150.00", cash: "70000.00" }, pct);
      expect(Number(n.transfer)).toBeLessThanOrEqual(Number(n.list));
      expect(Number(n.cash)).toBeLessThanOrEqual(Number(n.list));
    }
  });
});

describe("trimestres", () => {
  it("calcula el rango de cada trimestre calendario", () => {
    expect(quarterRange("2026-Q1")).toEqual({ start: "2026-01-01", end: "2026-03-31" });
    expect(quarterRange("2026-Q2")).toEqual({ start: "2026-04-01", end: "2026-06-30" });
    expect(quarterRange("2026-Q4")).toEqual({ start: "2026-10-01", end: "2026-12-31" });
    expect(quarterRange("2028-Q1").end).toBe("2028-03-31");
  });

  it("ubica una fecha en su trimestre", () => {
    expect(quarterOf("2026-11-05")).toBe("2026-Q4");
    expect(quarterOf("2026-03-31")).toBe("2026-Q1");
    expect(quarterOf("2026-04-01")).toBe("2026-Q2");
  });

  it("lista los próximos trimestres cruzando el año", () => {
    expect(upcomingQuarters("2026-11-05", 4)).toEqual(["2026-Q4", "2027-Q1", "2027-Q2", "2027-Q3"]);
  });

  it("rechaza trimestres inválidos y los describe en español", () => {
    expect(() => quarterRange("2026-Q5")).toThrow();
    expect(quarterLabel("2026-Q4")).toContain("Octubre a diciembre");
  });
});

describe("validación de un aumento", () => {
  const ok = { percentage: 15, quarter: "2026-Q4", effectiveDate: "2026-12-01" };
  const today = "2026-11-05";

  it("acepta un aumento coherente", () => {
    expect(validateIncrease(ok, today)).toBeNull();
    expect(validateIncrease({ ...ok, percentage: 0 }, today)).toBeNull();
    expect(validateIncrease({ ...ok, percentage: 12.5 }, today)).toBeNull();
  });

  it("rechaza porcentajes negativos, no numéricos o con demasiados decimales", () => {
    expect(validateIncrease({ ...ok, percentage: -1 }, today)).toMatch(/negativo/);
    expect(validateIncrease({ ...ok, percentage: Number.NaN }, today)).toMatch(/número/);
    expect(validateIncrease({ ...ok, percentage: 10.123 }, today)).toMatch(/decimales/);
    expect(validateIncrease({ ...ok, percentage: 5000 }, today)).toMatch(/alto/);
  });

  it("rechaza fechas fuera del trimestre, pasadas o mal formadas", () => {
    expect(validateIncrease({ ...ok, effectiveDate: "2027-01-02" }, today)).toMatch(/dentro del trimestre/);
    expect(validateIncrease({ ...ok, effectiveDate: "2026-11-05" }, today)).toMatch(/posterior a hoy/);
    expect(validateIncrease({ ...ok, effectiveDate: "2026-10-15" }, today)).toMatch(/posterior a hoy/);
    expect(validateIncrease({ ...ok, effectiveDate: "ayer" }, today)).toMatch(/no es válida/);
    expect(validateIncrease({ ...ok, quarter: "2026-Q9" }, today)).toMatch(/trimestre/);
  });
});

describe("garantías del módulo (código y migración)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("solo el Director programa, modifica o cancela aumentos (validado en el servidor)", () => {
    const src = read("src/modules/payments/increase-actions.ts");
    expect(src.match(/requireRole\(\["director"\]\)/g)?.length).toBe(3);
    expect(src).not.toMatch(/requireRole\(\[[^\]]*administrativo/);
    const page = read("src/app/(dashboard)/director/settings/fee-increases/page.tsx");
    expect(page).toContain('requireRole(["director"])');
  });

  it("el cron aplica los aumentos sin intervención de un usuario y exige el secreto", () => {
    const route = read("src/app/api/cron/fee-increases/route.ts");
    expect(route).toContain("isAuthorizedCron");
    expect(route).toContain("applyDueIncreases");
    expect(read("vercel.json")).toContain("/api/cron/fee-increases");
  });

  it("la aplicación es atómica e idempotente: lock, estado 'programado' y un solo registro por cuota", () => {
    const svc = read("src/modules/payments/services/fee-increases.service.ts");
    expect(svc).toContain("pg_advisory_xact_lock");
    expect(svc).toContain('inc.status !== "scheduled"');
    const sql = read("src/lib/drizzle/migrations/0022_aumentos_trimestrales.sql");
    expect(sql).toContain("fee_price_history_payment_unique ON fee_price_history (increase_id, payment_id)");
    expect(sql).toContain("fee_increases_one_per_quarter ON fee_increases (quarter) WHERE status <> 'cancelled'");
  });

  it("jamás toca pagos confirmados: solo cuotas sin cobrar", () => {
    const svc = read("src/modules/payments/services/fee-increases.service.ts");
    expect(svc).toContain('const UNPAID = ["pending", "overdue", "suspended"]');
    expect(svc).not.toMatch(/"paid"/);
  });

  it("un aumento aplicado es inmutable en la base", () => {
    const sql = read("src/lib/drizzle/migrations/0022_aumentos_trimestrales.sql");
    expect(sql).toContain("Un aumento aplicado no se puede modificar");
    expect(sql).toContain("fee_price_history_append_only");
  });
});
