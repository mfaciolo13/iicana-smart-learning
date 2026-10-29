"use client";

import { useId } from "react";
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
import { COLORS, SERIES_COLORS, formatAxis, type ValueFormat } from "./palette";
import { ChartTooltip } from "./ChartTooltip";

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
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const common = {
    data,
    margin: { left: 0, right: 12, top: 8, bottom: 0 },
  };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="2 6" vertical={false} stroke="#e1e5ea" />
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
      <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "#c9d0d8", strokeDasharray: "3 3" }} />
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
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`a-${uid}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {series.map((s, i) => {
            const color = s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={color}
                fill={`url(#a-${uid}-${i})`}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: color }}
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
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              connectNulls
            />
          ))}
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
