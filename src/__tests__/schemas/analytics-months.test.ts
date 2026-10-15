import { describe, it, expect } from "vitest";
import { lastMonths, windowStart, fillMonths } from "@/modules/analytics/lib/months";

describe("ventana de meses de los gráficos", () => {
  it("devuelve los últimos meses del más viejo al más nuevo", () => {
    expect(lastMonths(3, "2026-10-14").map((m) => m.key)).toEqual(["2026-08", "2026-09", "2026-10"]);
  });

  it("cruza el cambio de año y etiqueta el año anterior", () => {
    const m = lastMonths(4, "2026-02-03");
    expect(m.map((x) => x.key)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(m.map((x) => x.label)).toEqual(["nov 25", "dic 25", "ene", "feb"]);
  });

  it("windowStart es el primer día del mes más viejo", () => {
    expect(windowStart(6, "2026-10-14")).toBe("2026-05-01");
  });

  it("fillMonths rellena con 0 los meses sin datos y convierte los números", () => {
    const months = lastMonths(3, "2026-10-14");
    const out = fillMonths(months, [{ m: "2026-09", n: "4" }], ["n"]);
    expect(out).toEqual([
      { mes: "ago", n: 0 },
      { mes: "sep", n: 4 },
      { mes: "oct", n: 0 },
    ]);
  });

  it("fillMonths puede dejar null en los meses sin datos (promedios)", () => {
    const out = fillMonths(lastMonths(2, "2026-10-14"), [{ m: "2026-10", avg: 8.5 }], ["avg"], null);
    expect(out).toEqual([{ mes: "sep", avg: null }, { mes: "oct", avg: 8.5 }]);
  });
});
