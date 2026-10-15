/** Paleta y formato compartidos por todos los gráficos. */

export const COLORS = {
  brand: "#2563eb",
  brandSoft: "#93c5fd",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  violet: "#8b5cf6",
  sky: "#0ea5e9",
  slate: "#94a3b8",
  grid: "#f1f5f9",
  axis: "#94a3b8",
  label: "#475569",
} as const;

/** Colores para series cuando el llamador no indica uno. */
export const SERIES_COLORS = [COLORS.brand, COLORS.green, COLORS.amber, COLORS.violet, COLORS.sky, COLORS.red];

export type ValueFormat = "number" | "percent" | "money" | "grade";

const moneyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const compactMoneyFmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatValue(format: ValueFormat | undefined, v: number): string {
  switch (format) {
    case "percent":
      return `${Math.round(v * 10) / 10}%`;
    case "money":
      return moneyFmt.format(v);
    case "grade":
      return (Math.round(v * 10) / 10).toFixed(1);
    default:
      return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(v);
  }
}

/** Versión corta para los ejes (los montos grandes no entran enteros). */
export function formatAxis(format: ValueFormat | undefined, v: number): string {
  if (format === "money") return compactMoneyFmt.format(v);
  return formatValue(format, v);
}

export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
} as const;

/** Color semáforo para porcentajes de asistencia. */
export function attendanceColor(pct: number): string {
  if (pct >= 80) return COLORS.green;
  if (pct >= 60) return COLORS.amber;
  return COLORS.red;
}

/** Color semáforo para notas de 1 a 10 (7 = aprobación). */
export function gradeColor(score: number): string {
  if (score >= 7) return COLORS.green;
  if (score >= 5) return COLORS.amber;
  return COLORS.red;
}

/** Agrega a cada fila un campo "color" calculado en el servidor (ver BarsChart.colorKey). */
export function withColor<T extends object>(rows: T[], pick: (row: T) => string): Array<T & { color: string }> {
  return rows.map((r) => ({ ...r, color: pick(r) }));
}
