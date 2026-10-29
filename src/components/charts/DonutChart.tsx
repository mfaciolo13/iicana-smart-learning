"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS, SERIES_COLORS, formatValue, type ValueFormat } from "./palette";
import { ChartTooltip } from "./ChartTooltip";

export interface DonutSlice {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  format?: ValueFormat;
  height?: number;
  /** Texto bajo el total, en el centro (por ejemplo "cuotas"). */
  centerLabel?: string;
}

/** Composición de un total: anillo fino con puntas redondeadas y leyenda con barra de proporción. */
export function DonutChart({ data, format, height = 168, centerLabel }: DonutChartProps) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>Sin datos</div>;
  }
  const colorOf = (s: DonutSlice, i: number) => s.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
  return (
    // Contenedor de consulta: en tarjetas angostas la leyenda va debajo del anillo, en las anchas al costado.
    <div className="@container">
      <div className="flex flex-col items-center gap-5 @sm:flex-row">
        <div className="relative shrink-0" style={{ width: height, height }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                innerRadius="74%"
                outerRadius="96%"
                cornerRadius={slices.length > 1 ? 8 : 0}
                paddingAngle={slices.length > 1 ? 4 : 0}
                stroke="none"
              >
                {slices.map((s, i) => (
                  <Cell key={s.label} fill={colorOf(s, i)} />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltip format={format} colorKey="fill" />}
                wrapperStyle={{ zIndex: 20 }}
                allowEscapeViewBox={{ x: true, y: true }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-bold leading-none tracking-tight text-slate-900 tabular-nums">{formatValue(format, total)}</span>
            {centerLabel && <span className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{centerLabel}</span>}
          </div>
        </div>
        <ul className="w-full flex-1 min-w-0 space-y-3">
          {slices.map((s, i) => {
            const pct = Math.round((s.value / total) * 100);
            return (
              <li key={s.label} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorOf(s, i) }} />
                    <span className="truncate text-slate-600">{s.label}</span>
                  </span>
                  <span className="whitespace-nowrap font-semibold text-slate-800 tabular-nums">
                    {formatValue(format, s.value)}
                    <span className="ml-1 font-normal text-slate-400">{pct}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorOf(s, i) }} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export { COLORS };
