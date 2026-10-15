"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS, SERIES_COLORS, TOOLTIP_STYLE, formatAxis, formatValue, type ValueFormat } from "./palette";

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

interface TrendChartProps {
  data: object[];
  xKey: string;
  series: ChartSeries[];
  format?: ValueFormat;
  height?: number;
  kind?: "area" | "line";
  /** Dominio fijo del eje Y, por ejemplo [0, 100] para porcentajes. */
  yDomain?: [number, number];
  referenceLine?: { y: number; label: string };
}

/** Evolución en el tiempo: una o varias series sobre un eje X de períodos. */
export function TrendChart({ data, xKey, series, format, height = 240, kind = "area", yDomain, referenceLine }: TrendChartProps) {
  const common = {
    data,
    margin: { left: 0, right: 12, top: 8, bottom: 0 },
  };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} />
      <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: COLORS.axis }} axisLine={false} tickLine={false} />
      <YAxis
        width={48}
        domain={yDomain}
        tickFormatter={(v) => formatAxis(format, Number(v))}
        tick={{ fontSize: 11, fill: COLORS.axis }}
        axisLine={false}
        tickLine={false}
        allowDecimals={false}
      />
      <Tooltip
        formatter={(value, name) => [formatValue(format, Number(value ?? 0)), String(name)]}
        contentStyle={TOOLTIP_STYLE}
        cursor={{ stroke: "#cbd5e1" }}
      />
      {series.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />}
      {referenceLine && (
        <ReferenceLine
          y={referenceLine.y}
          stroke={COLORS.green}
          strokeDasharray="4 4"
          label={{ value: referenceLine.label, fontSize: 10, fill: COLORS.green, position: "insideTopRight" }}
        />
      )}
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {kind === "area" ? (
        <AreaChart {...common}>
          {axes}
          {series.map((s, i) => {
            const color = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color}
                fill={color}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            );
          })}
        </AreaChart>
      ) : (
        <LineChart {...common}>
          {axes}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
