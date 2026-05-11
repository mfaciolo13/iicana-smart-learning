"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { GradeAvgByCourse } from "@/modules/reports/services/dashboard.service";

interface Props {
  data: GradeAvgByCourse[];
}

function barColor(avg: number) {
  if (avg >= 7) return "#3b82f6";
  if (avg >= 5) return "#f59e0b";
  return "#ef4444";
}

export function GradesChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        Sin notas registradas aún
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="courseName"
          tick={{ fontSize: 10, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          domain={[0, 10]}
          ticks={[0, 2, 4, 6, 7, 8, 10]}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <ReferenceLine y={7} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} />
        <Tooltip
          formatter={(value) => [typeof value === "number" ? value.toFixed(1) : value, "Promedio"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Bar dataKey="avg" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => (
            <Cell key={i} fill={barColor(entry.avg)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
