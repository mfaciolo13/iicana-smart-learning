"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS, SERIES_COLORS, TOOLTIP_STYLE, formatAxis, formatValue, type ValueFormat } from "./palette";
import type { ChartSeries } from "./TrendChart";

interface BarsChartProps {
  data: object[];
  /** Clave de la categoría (eje de nombres). */
  xKey: string;
  series: ChartSeries[];
  format?: ValueFormat;
  /** "vertical" = barras horizontales con nombres a la izquierda (mejor con nombres largos). */
  layout?: "vertical" | "horizontal";
  stacked?: boolean;
  height?: number;
  /**
   * Con una sola serie, nombre del campo de cada fila que trae el color de su barra (por ejemplo
   * "color"). Va en los datos y no como función porque este componente es de cliente y las
   * funciones no cruzan de servidor a cliente. Ver withColor() en palette.ts.
   */
  colorKey?: string;
  showLabels?: boolean;
  domain?: [number, number];
  /** Ancho reservado para los nombres cuando layout="vertical". */
  categoryWidth?: number;
  referenceLine?: { value: number; label: string };
}

/** Comparación entre categorías: barras agrupadas, apiladas u horizontales. */
export function BarsChart({
  data,
  xKey,
  series,
  format,
  layout = "horizontal",
  stacked = false,
  height = 240,
  colorKey,
  showLabels = false,
  domain,
  categoryWidth = 96,
  referenceLine,
}: BarsChartProps) {
  const isVertical = layout === "vertical";
  const single = series.length === 1;

  const valueAxis = isVertical ? (
    <XAxis
      type="number"
      domain={domain}
      tickFormatter={(v) => formatAxis(format, Number(v))}
      tick={{ fontSize: 11, fill: COLORS.axis }}
      axisLine={false}
      tickLine={false}
      allowDecimals={false}
    />
  ) : (
    <YAxis
      width={48}
      domain={domain}
      tickFormatter={(v) => formatAxis(format, Number(v))}
      tick={{ fontSize: 11, fill: COLORS.axis }}
      axisLine={false}
      tickLine={false}
      allowDecimals={false}
    />
  );
  const categoryAxis = isVertical ? (
    <YAxis dataKey={xKey} type="category" width={categoryWidth} tick={{ fontSize: 11, fill: COLORS.label }} axisLine={false} tickLine={false} />
  ) : (
    <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: COLORS.axis }} axisLine={false} tickLine={false} interval={0} />
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{ left: 0, right: showLabels && isVertical ? 44 : 12, top: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={!isVertical} vertical={isVertical} stroke={COLORS.grid} />
        {categoryAxis}
        {valueAxis}
        <Tooltip
          formatter={(value, name) => [formatValue(format, Number(value ?? 0)), String(name)]}
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "#f8fafc" }}
        />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
        {referenceLine && (
          <ReferenceLine
            {...(isVertical ? { x: referenceLine.value } : { y: referenceLine.value })}
            stroke={COLORS.green}
            strokeDasharray="4 4"
            label={{ value: referenceLine.label, fontSize: 10, fill: COLORS.green, position: "insideTopRight" }}
          />
        )}
        {series.map((s, i) => {
          const color = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={color}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={isVertical ? 18 : 36}
            >
              {single && colorKey
                ? data.map((row, idx) => <Cell key={idx} fill={String((row as Record<string, unknown>)[colorKey] ?? color)} />)
                : null}
              {showLabels && (
                <LabelList
                  dataKey={s.key}
                  position={isVertical ? "right" : "top"}
                  formatter={(v) => (v == null ? "" : formatValue(format, Number(v)))}
                  style={{ fontSize: 11, fill: COLORS.label, fontWeight: 500 }}
                />
              )}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
