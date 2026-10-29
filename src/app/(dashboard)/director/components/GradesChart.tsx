"use client";

import { BarsChart } from "@/components/charts/BarsChart";
import { gradeColor, withColor } from "@/components/charts/palette";
import type { GradeAvgByCourse } from "@/modules/reports/services/dashboard.service";

interface Props {
  data: GradeAvgByCourse[];
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
    <BarsChart
      data={withColor(data, (d) => gradeColor(d.avg))}
      xKey="courseName"
      layout="vertical"
      format="grade"
      domain={[0, 10]}
      categoryWidth={110}
      height={Math.max(220, data.length * 36 + 40)}
      showLabels
      referenceLine={{ value: 7, label: "7" }}
      series={[{ key: "avg", label: "Promedio" }]}
      colorKey="color"
    />
  );
}
