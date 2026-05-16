"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PaymentStatusCount } from "@/modules/reports/services/dashboard.service";

interface Props {
  data: PaymentStatusCount[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: "Pagado", color: "#10b981" },
  pending: { label: "Pendiente", color: "#f59e0b" },
  overdue: { label: "Vencido", color: "#ef4444" },
  suspended: { label: "Suspendido", color: "#94a3b8" },
};

export function PaymentsDonut({ data }: Props) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        Sin pagos registrados
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: STATUS_CONFIG[d.status]?.label ?? d.status,
    value: d.count,
    color: STATUS_CONFIG[d.status]?.color ?? "#94a3b8",
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          label={({ value, percent }: { value?: number; percent?: number }) =>
            (percent ?? 0) > 0.04 ? `${value ?? ""}` : ""
          }
          labelLine={false}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const n = typeof value === "number" ? value : 0;
            return [`${n} (${Math.round((n / total) * 100)}%)`, name];
          }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ fontSize: 11, color: "#475569" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
