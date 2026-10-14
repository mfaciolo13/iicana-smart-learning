import { describe, it, expect } from "vitest";
import { meetsAttendance, meetsGrades, displayAverage } from "@/modules/promotions/eligibility";

// SCRUM-286: la elegibilidad se evalúa con los valores exactos, no con los redondeados

describe("meetsAttendance", () => {
  it("80% exacto alcanza", () => {
    expect(meetsAttendance(4, 5)).toBe(true);
    expect(meetsAttendance(80, 100)).toBe(true);
  });

  it("79,5% no alcanza (antes el redondeo lo llevaba a 80)", () => {
    expect(meetsAttendance(159, 200)).toBe(false);
  });

  it("sin clases no alcanza", () => {
    expect(meetsAttendance(0, 0)).toBe(false);
  });
});

describe("meetsGrades", () => {
  it("7 exacto alcanza; 6,95 no", () => {
    expect(meetsGrades(7)).toBe(true);
    expect(meetsGrades(6.95)).toBe(false);
  });

  it("sin notas no alcanza", () => {
    expect(meetsGrades(null)).toBe(false);
    expect(meetsGrades(undefined)).toBe(false);
  });
});

describe("displayAverage", () => {
  it("muestra 2 decimales sin llevar 6,95 a 7", () => {
    expect(displayAverage(6.95)).toBe(6.95);
    expect(displayAverage(7.3333)).toBe(7.33);
    expect(displayAverage(null)).toBeNull();
  });
});
