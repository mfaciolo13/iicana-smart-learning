"use client";

import { BarsChart } from "@/components/charts/BarsChart";
import { attendanceColor, withColor } from "@/components/charts/palette";
import type { AttendanceByCourse } from "@/modules/reports/services/dashboard.service";

interface Props {
  data: AttendanceByCourse[];
}

export function AttendanceChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-400">
        Sin datos de asistencia aún
      </div>
    );
  }

  return (
    <BarsChart
      data={withColor(data, (d) => attendanceColor(d.pct))}
      xKey="courseName"
      layout="vertical"
      format="percent"
      domain={[0, 100]}
      categoryWidth={110}
      height={Math.max(220, data.length * 36 + 40)}
      showLabels
      series={[{ key: "pct", label: "Asistencia" }]}
      colorKey="color"
    />
  );
}
