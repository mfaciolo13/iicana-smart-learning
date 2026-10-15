"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLORS, SERIES_COLORS, TOOLTIP_STYLE, formatValue, type ValueFormat } from "./palette";

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

/** Composición de un total: cada porción con su leyenda y valor al costado. */
export function DonutChart({ data, format, height = 190, centerLabel }: DonutChartProps) {
  const slices = data.filter((d) => d.value > 0);
  const total = slices.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>Sin datos</div>;
  }
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius="62%" outerRadius="92%" paddingAngle={slices.length > 1 ? 2 : 0} stroke="none">
              {slices.map((s, i) => (
                <Cell key={s.label} fill={s.color ?? SERIES_COLORS[i % SERIES_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [formatValue(format, Number(value ?? 0)), String(name)]} contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-900">{formatValue(format, total)}</span>
          {centerLabel && <span className="text-[10px] text-slate-400">{centerLabel}</span>}
        </div>
      </div>
      <ul className="flex-1 min-w-0 space-y-1.5">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }} />
              <span className="text-slate-600 truncate">{s.label}</span>
            </span>
            <span className="font-medium text-slate-800 whitespace-nowrap">
              {formatValue(format, s.value)}
              <span className="text-slate-400 font-normal"> · {Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { COLORS };
