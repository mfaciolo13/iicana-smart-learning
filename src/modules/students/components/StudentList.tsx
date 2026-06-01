import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import type { StudentListItem } from "../types";
import { Badge } from "@/components/ui/Badge";


const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  suspended: { label: "Suspendido", variant: "danger" },
  graduated: { label: "Egresado", variant: "info" as never },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

interface StudentListProps {
  students: StudentListItem[];
}

export function StudentList({ students }: StudentListProps) {
  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Aún no hay alumnos cargados</p>
        <p className="text-sm text-slate-400 mt-1">Empezá registrando el primero.</p>
        <Link
          href="/director/students/new"
          className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
        >
          + Nuevo alumno
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {students.map((student) => {
          const status = STATUS_CONFIG[student.status] ?? { label: student.status, variant: "neutral" as const };
          return (
            <Link
              key={student.id}
              href={`/director/students/${student.id}`}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{student.fullName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{student.dni}</p>
                {student.level && (
                  <p className="text-xs text-slate-500 mt-0.5">{LEVEL_LABELS[student.level] ?? student.level}</p>
                )}
              </div>
              <div className="ml-3 shrink-0 flex items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b-2 border-brand-700">
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Nombre</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">DNI</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Email</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Nivel</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Estado</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student) => {
              const status = STATUS_CONFIG[student.status] ?? { label: student.status, variant: "neutral" as const };
              return (
                <tr key={student.id} className="hover:bg-brand-50 transition-colors relative group cursor-pointer">
                  <td className="py-3.5 pr-4 font-medium text-slate-900">{student.fullName}</td>
                  <td className="py-3.5 pr-4 font-mono text-slate-600 text-xs">{student.dni}</td>
                  <td className="py-3.5 pr-4 text-slate-500 hidden md:table-cell">{student.email}</td>
                  <td className="py-3.5 pr-4">
                    {student.level ? (
                      <Badge variant="info" dot={false}>{LEVEL_LABELS[student.level] ?? student.level}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <Link href={`/director/students/${student.id}`} className="after:absolute after:inset-0 after:content-['']">
                      <Eye className="w-4 h-4 text-slate-300 group-hover:text-brand-700 transition-colors" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
