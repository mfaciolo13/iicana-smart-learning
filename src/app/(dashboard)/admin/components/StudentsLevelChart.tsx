"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { StudentsByLevel } from "@/modules/reports/services/dashboard.service";

interface Props {
  data: StudentsByLevel[];
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Princ.",
  elementary: "Elem.",
  pre_intermediate: "Pre-Int.",
  intermediate: "Inter.",
  upper_intermediate: "Upper.",
  advanced: "Avanz.",
};

const LEVEL_ORDER = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced"];

export function StudentsLevelChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        Sin alumnos activos registrados
      </div>
    );
  }

  const sorted = LEVEL_ORDER
    .map((level) => {
      const found = data.find((d) => d.level === level);
      return { level: LEVEL_LABELS[level] ?? level, count: found?.count ?? 0 };
    })
    .filter((d) => d.count > 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={sorted} margin={{ left: 0, right: 16, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="level"
          tick={{ fontSize: 11, fill: "#475569" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#94a3b8" }}
          axisLine={false}
          tickLine={false}
          width={24}
        />
        <Tooltip
          formatter={(value) => [value ?? 0, "Alumnos"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          cursor={{ fill: "#f8fafc" }}
        />
        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
