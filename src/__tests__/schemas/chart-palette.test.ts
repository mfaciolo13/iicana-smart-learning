import { describe, it, expect } from "vitest";
import { attendanceColor, formatAxis, formatValue, gradeColor, withColor, COLORS } from "@/components/charts/palette";

describe("formato de los gráficos", () => {
  it("formatea porcentajes, notas y números en es-AR", () => {
    expect(formatValue("percent", 83.333)).toBe("83.3%");
    expect(formatValue("grade", 7.25)).toBe("7.3");
    expect(formatValue("number", 1234.5)).toBe("1.234,5");
  });

  it("los montos van en pesos y el eje usa la versión compacta", () => {
    expect(formatValue("money", 15000)).toContain("15.000");
    expect(formatAxis("money", 1_500_000)).toMatch(/1[,.]5/);
  });
});

describe("colores semáforo", () => {
  it("asistencia: verde desde 80, ámbar desde 60, rojo debajo", () => {
    expect(attendanceColor(80)).toBe(COLORS.green);
    expect(attendanceColor(79.9)).toBe(COLORS.amber);
    expect(attendanceColor(59)).toBe(COLORS.red);
  });

  it("notas: verde desde 7, ámbar desde 5, rojo debajo", () => {
    expect(gradeColor(7)).toBe(COLORS.green);
    expect(gradeColor(6.9)).toBe(COLORS.amber);
    expect(gradeColor(4.9)).toBe(COLORS.red);
  });

  it("withColor agrega el color calculado a cada fila sin tocar el resto", () => {
    const rows = withColor([{ n: 90 }, { n: 40 }], (r) => attendanceColor(r.n));
    expect(rows).toEqual([
      { n: 90, color: COLORS.green },
      { n: 40, color: COLORS.red },
    ]);
  });
});
