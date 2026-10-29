/** Paleta y formato compartidos por todos los gráficos (ver docs/IDENTIDAD_VISUAL.md). */

export const COLORS = {
  brand: "#2d5383",
  brandSoft: "#86a6cc",
  green: "#3aa348",
  amber: "#e27c00",
  red: "#bb4141",
  violet: "#74578f",
  sky: "#0284d6",
  slate: "#94a0ad",
  grid: "#eef0f3",
  axis: "#94a0ad",
  label: "#515c6a",
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
  fontFamily: "var(--font-sans)",
  borderRadius: 8,
  border: "1px solid #e1e5ea",
  boxShadow: "0 4px 12px rgba(22,27,34,0.08)",
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
