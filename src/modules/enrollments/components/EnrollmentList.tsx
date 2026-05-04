import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { EnrollmentListItem } from "../types";
import { Badge } from "@/components/ui/Badge";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "warning" }> = {
  active: { label: "Activo", variant: "success" },
  completed: { label: "Completado", variant: "neutral" },
  withdrawn: { label: "Dado de baja", variant: "warning" },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-inter.",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-inter.",
  advanced: "Avanzado",
};

interface EnrollmentListProps {
  enrollments: EnrollmentListItem[];
  showNewLink?: boolean;
}

export function EnrollmentList({ enrollments, showNewLink = false }: EnrollmentListProps) {
  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin inscripciones</p>
        <p className="text-sm text-slate-400 mt-1">Todavía no hay inscripciones registradas.</p>
        {showNewLink && (
          <Link
            href="/admin/enrollments/new"
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
          >
            + Nueva inscripción
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <thead>
          <tr className="border-b-2 border-brand-700">
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">
              Alumno
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden sm:table-cell">
              DNI
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">
              Curso
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">
              Nivel
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden lg:table-cell">
              Fecha
            </th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">
              Estado
            </th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {enrollments.map((e) => {
            const statusCfg = STATUS_CONFIG[e.status] ?? { label: e.status, variant: "neutral" as const };
            return (
              <tr key={e.id} className="hover:bg-brand-50 transition-colors">
                <td className="py-3.5 pr-4 font-medium text-slate-900">{e.studentName}</td>
                <td className="py-3.5 pr-4 font-mono text-slate-600 text-xs hidden sm:table-cell">{e.studentDni}</td>
                <td className="py-3.5 pr-4 text-slate-700">{e.courseName}</td>
                <td className="py-3.5 pr-4 hidden md:table-cell">
                  <Badge variant="info" dot={false}>{LEVEL_LABELS[e.courseLevel] ?? e.courseLevel}</Badge>
                </td>
                <td className="py-3.5 pr-4 text-slate-500 text-xs hidden lg:table-cell">
                  {new Date(e.enrolledAt).toLocaleDateString("es-AR")}
                </td>
                <td className="py-3.5 pr-4">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                </td>
                <td className="py-3.5 text-right">
                  <Link
                    href={`/admin/enrollments/${e.id}`}
                    className="text-brand-700 hover:underline text-xs font-medium inline-flex items-center gap-1"
                  >
                    Ver <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
