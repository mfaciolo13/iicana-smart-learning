import * as XLSX from "xlsx-js-style";

const BRAND = "1D4ED8";
const WHITE = "FFFFFF";
const BORDER = { style: "thin" as const, color: { rgb: "CBD5E1" } };
const BORDER_HEADER = { style: "thin" as const, color: { rgb: "1E40AF" } };

const titleStyle = {
  font: { bold: true, sz: 13, color: { rgb: WHITE } },
  fill: { patternType: "solid" as const, fgColor: { rgb: BRAND } },
  alignment: { horizontal: "center" as const, vertical: "center" as const },
};

const headerStyle = {
  font: { bold: true, sz: 11, color: { rgb: WHITE } },
  fill: { patternType: "solid" as const, fgColor: { rgb: BRAND } },
  border: { top: BORDER_HEADER, bottom: BORDER_HEADER, left: BORDER_HEADER, right: BORDER_HEADER },
  alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: true },
};

const dataStyle = {
  border: { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER },
  alignment: { vertical: "center" as const },
};

/** Fecha "sólo día" (YYYY-MM-DD) como valor de fecha de Excel, sin corrimiento por zona horaria. */
export function excelDate(isoDate: string | Date | null | undefined): Date | string {
  if (!isoDate) return "—";
  if (isoDate instanceof Date) return isoDate;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)) : isoDate;
}

export const EXCEL_FORMATS = {
  date: "dd/mm/yyyy",
  money: '"$"#,##0.00',
  percent: '0.0"%"',
  grade: "0.0",
} as const;

interface ReportConfig {
  title: string;
  headers: string[];
  rows: (string | number | boolean | Date)[][];
  colWidths: { wch: number }[];
  sheetName: string;
  /** Formato numérico por índice de columna (SCRUM-329): las fechas y los montos salen como valores, no como texto. */
  formats?: Record<number, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildStyledReport({ title, headers, rows, colWidths, sheetName, formats = {} }: ReportConfig): any {
  const numCols = headers.length;
  const titleRow = [title, ...Array(numCols - 1).fill("")];
  const aoa = [titleRow, headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });

  // Merge title across all columns
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } }];
  ws["!cols"] = colWidths;

  // Title row (row 0) — style all cells so background fills the merge
  for (let c = 0; c < numCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: 0, c });
    if (!ws[ref]) ws[ref] = { t: "s", v: "" };
    (ws[ref] as XLSX.CellObject & { s: unknown }).s = titleStyle;
  }

  // Header row (row 1)
  for (let c = 0; c < numCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: 1, c });
    if (ws[ref]) (ws[ref] as XLSX.CellObject & { s: unknown }).s = headerStyle;
  }

  // Data rows (row 2+)
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < numCols; c++) {
      const ref = XLSX.utils.encode_cell({ r: r + 2, c });
      if (ws[ref]) {
        (ws[ref] as XLSX.CellObject & { s: unknown }).s = dataStyle;
        const cell = ws[ref] as XLSX.CellObject;
        if (formats[c] && (cell.t === "n" || cell.t === "d")) cell.z = formats[c];
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
