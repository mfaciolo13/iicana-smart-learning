"use client";

import { useId } from "react";
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
import { COLORS, SERIES_COLORS, formatAxis, formatValue, type ValueFormat } from "./palette";
import { BarGradient, ChartTooltip, gradId } from "./ChartTooltip";
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
  const uid = useId();
  const isVertical = layout === "vertical";
  const single = series.length === 1;
  const seriesColor = (s: ChartSeries, i: number) => s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
  // Un degradé por color distinto (series y colores por fila).
  const colors = new Set<string>(series.map(seriesColor));
  if (single && colorKey) data.forEach((row) => {
    const c = (row as Record<string, unknown>)[colorKey];
    if (typeof c === "string") colors.add(c);
  });
  const fillFor = (color: string) => `url(#${gradId(uid, color)})`;

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
        margin={{
          left: 0,
          right: showLabels && isVertical ? (format === "money" ? 84 : 44) : 12,
          top: showLabels && !isVertical ? 20 : 8,
          bottom: 0,
        }}
      >
        <defs>
          {[...colors].map((c) => (
            <BarGradient key={c} id={gradId(uid, c)} color={c} horizontal={isVertical} />
          ))}
        </defs>
        <CartesianGrid strokeDasharray="2 6" horizontal={!isVertical} vertical={isVertical} stroke="#e2e8f0" />
        {categoryAxis}
        {valueAxis}
        <Tooltip
          content={<ChartTooltip format={format} colorKey={single ? colorKey : undefined} />}
          cursor={{ fill: "#f1f5f9", fillOpacity: 0.7, radius: 6 }}
          allowEscapeViewBox={{ x: false, y: true }}
        />
        {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
        {referenceLine && (
          <ReferenceLine
            {...(isVertical ? { x: referenceLine.value } : { y: referenceLine.value })}
            stroke={COLORS.green}
            strokeDasharray="4 4"
            label={{ value: referenceLine.label, fontSize: 10, fill: COLORS.green, position: "insideTopRight" }}
          />
        )}
        {series.map((s, i) => {
          const color = seriesColor(s, i);
          return (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={fillFor(color)}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : isVertical ? [0, 8, 8, 0] : [8, 8, 0, 0]}
              maxBarSize={isVertical ? 16 : 34}
              background={isVertical && single ? { fill: "#f8fafc", radius: 8 } : undefined}
            >
              {single && colorKey
                ? data.map((row, idx) => <Cell key={idx} fill={fillFor(String((row as Record<string, unknown>)[colorKey] ?? color))} />)
                : null}
              {showLabels && (
                <LabelList
                  dataKey={s.key}
                  position={isVertical ? "right" : "top"}
                  formatter={(v) => (v == null ? "" : formatValue(format, Number(v)))}
                  style={{ fontSize: 11, fill: COLORS.label, fontWeight: 600 }}
                />
              )}
            </Bar>
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
