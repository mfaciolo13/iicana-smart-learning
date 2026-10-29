"use client";

import { DonutChart } from "@/components/charts/DonutChart";
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

  return (
    <DonutChart
      centerLabel="cuotas"
      data={data.map((d) => ({
        label: STATUS_CONFIG[d.status]?.label ?? d.status,
        value: d.count,
        color: STATUS_CONFIG[d.status]?.color ?? "#94a3b8",
      }))}
    />
  );
}
