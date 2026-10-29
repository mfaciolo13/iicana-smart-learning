"use client";

import { BarsChart } from "@/components/charts/BarsChart";
import { COLORS } from "@/components/charts/palette";
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
    <BarsChart
      data={sorted}
      xKey="level"
      format="number"
      showLabels
      series={[{ key: "count", label: "Alumnos", color: COLORS.violet }]}
    />
  );
}
