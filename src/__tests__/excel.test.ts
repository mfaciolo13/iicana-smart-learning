import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx-js-style";
import { buildStyledReport, excelDate, EXCEL_FORMATS } from "@/lib/excel";

// SCRUM-329: los reportes exportan números y fechas como valores con formato, no como texto

describe("buildStyledReport", () => {
  const buffer = buildStyledReport({
    title: "Reporte",
    headers: ["Alumno", "Monto ($)", "Vencimiento", "% Asistencia"],
    rows: [["Ana", 15000.5, excelDate("2026-10-10"), 75]],
    colWidths: [{ wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }],
    sheetName: "Hoja",
    formats: { 1: EXCEL_FORMATS.money, 2: EXCEL_FORMATS.date, 3: EXCEL_FORMATS.percent },
  });
  const ws = XLSX.read(buffer, { type: "buffer", cellDates: true, cellNF: true }).Sheets["Hoja"];

  it("guarda el monto y el porcentaje como números con formato", () => {
    expect(ws["B3"].t).toBe("n");
    expect(ws["B3"].v).toBe(15000.5);
    expect(ws["B3"].z).toBe(EXCEL_FORMATS.money);
    expect(ws["D3"].t).toBe("n");
    expect(ws["D3"].z).toBe(EXCEL_FORMATS.percent);
  });

  it("guarda la fecha como fecha, sin correrla un día", () => {
    expect(ws["C3"].t).toBe("d");
    expect(ws["C3"].z).toBe(EXCEL_FORMATS.date);
    const d = ws["C3"].v as Date;
    expect([d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]).toEqual([2026, 10, 10]);
  });
});

describe("excelDate", () => {
  it("convierte YYYY-MM-DD, deja pasar Date y marca vacío con guion", () => {
    expect(excelDate("2026-01-05")).toBeInstanceOf(Date);
    expect(excelDate(null)).toBe("—");
    const d = new Date();
    expect(excelDate(d)).toBe(d);
  });
});
