"use client";

import { formatValue, type ValueFormat } from "./palette";

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  format?: ValueFormat;
  /** Campo de la fila con el color de la barra/porción (ver BarsChart.colorKey). */
  colorKey?: string;
}

/** Tooltip oscuro compartido por todos los gráficos: título, un punto de color por serie y el valor destacado. */
export function ChartTooltip({ active, label, payload, format, colorKey }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900/95 px-3 py-2 shadow-xl shadow-slate-900/20 backdrop-blur-sm ring-1 ring-white/10">
      {label !== undefined && label !== "" && <p className="mb-1 text-[11px] font-medium text-slate-400">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((p, i) => {
          const rowColor = colorKey ? (p.payload?.[colorKey] as string | undefined) : undefined;
          const dot = rowColor ?? p.color ?? "#94a0ad";
          return (
            <li key={`${p.name}-${i}`} className="flex items-center gap-2 text-xs text-white">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
              <span className="text-slate-300">{p.name}</span>
              <span className="ml-auto pl-3 font-semibold tabular-nums">{formatValue(format, Number(p.value ?? 0))}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Degradé de una barra: más intenso en el extremo del valor. `id` debe ser único por gráfico y color. */
export function BarGradient({ id, color, horizontal }: { id: string; color: string; horizontal?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={horizontal ? 1 : 0} y2={horizontal ? 0 : 1}>
      <stop offset="0%" stopColor={color} stopOpacity={horizontal ? 0.55 : 1} />
      <stop offset="100%" stopColor={color} stopOpacity={horizontal ? 1 : 0.55} />
    </linearGradient>
  );
}

/** Identificador seguro para usar dentro de url(#...). */
export function gradId(uid: string, color: string): string {
  return `g-${uid}-${color}`.replace(/[^a-zA-Z0-9_-]/g, "");
}
