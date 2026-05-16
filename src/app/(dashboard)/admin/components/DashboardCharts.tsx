"use client";

import { useState } from "react";
import Link from "next/link";
import { AttendanceChart } from "./AttendanceChart";
import { GradesChart } from "./GradesChart";
import { StudentsLevelChart } from "./StudentsLevelChart";
import { PaymentsDonut } from "./PaymentsDonut";
import type { PaymentStatusCount, StudentsByLevel } from "@/modules/reports/services/dashboard.service";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-inter.",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-inter.",
  advanced: "Avanzado",
};

const LEVEL_ORDER = ["beginner", "elementary", "pre_intermediate", "intermediate", "upper_intermediate", "advanced"];

interface AttendanceWithLevel {
  courseName: string;
  pct: number;
  level: string;
}

interface GradeWithLevel {
  courseName: string;
  avg: number;
  level: string;
}

interface DashboardChartsProps {
  attendanceData: AttendanceWithLevel[];
  gradesData: GradeWithLevel[];
  levelData: StudentsByLevel[];
  paymentCounts: PaymentStatusCount[];
}

export function DashboardCharts({ attendanceData, gradesData, levelData, paymentCounts }: DashboardChartsProps) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const levelsInData = LEVEL_ORDER.filter((level) =>
    levelData.some((d) => d.level === level) ||
    attendanceData.some((d) => d.level === level) ||
    gradesData.some((d) => d.level === level)
  );

  const filteredAttendance = selectedLevel
    ? attendanceData.filter((d) => d.level === selectedLevel)
    : attendanceData;

  const filteredGrades = selectedLevel
    ? gradesData.filter((d) => d.level === selectedLevel)
    : gradesData;

  const filteredLevel = selectedLevel
    ? levelData.filter((d) => d.level === selectedLevel)
    : levelData;

  return (
    <div className="space-y-4">
      {levelsInData.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500 mr-1">Filtrar por nivel:</span>
            <button
              onClick={() => setSelectedLevel(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedLevel === null
                  ? "bg-brand-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Todos
            </button>
            {levelsInData.map((level) => (
              <button
                key={level}
                onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedLevel === level
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {LEVEL_LABELS[level] ?? level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Asistencia por curso</h2>
            <Link href="/admin/attendance" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">% de presentes sobre el total de clases registradas</p>
          <AttendanceChart data={filteredAttendance} />
          <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> ≥ 80%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> 60–79%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" /> &lt; 60%</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Estado de pagos</h2>
            <Link href="/admin/payments" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-2">Distribución de cuotas</p>
          <PaymentsDonut data={paymentCounts} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Nota promedio por curso</h2>
            <Link href="/admin/grades" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">Promedio de todas las evaluaciones · línea verde = mínimo aprobación (7)</p>
          <GradesChart data={filteredGrades} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-slate-900">Alumnos por nivel</h2>
            <Link href="/admin/students" className="text-xs text-brand-700 hover:underline">Ver todo</Link>
          </div>
          <p className="text-xs text-slate-400 mb-4">Alumnos activos agrupados por nivel de inglés</p>
          <StudentsLevelChart data={filteredLevel} />
        </div>
      </div>
    </div>
  );
}
