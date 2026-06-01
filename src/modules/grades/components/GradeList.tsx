import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import type { GradeWithDetails } from "../types";
import { Badge } from "@/components/ui/Badge";

const TYPE_LABELS: Record<string, string> = {
  parcial: "Parcial",
  final: "Final",
  oral: "Oral",
  homework: "Tarea",
  quiz: "Quiz",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-inter.",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-inter.",
  advanced: "Avanzado",
};

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 7) return "success";
  if (score >= 5) return "warning";
  return "danger";
}

interface GradeListProps {
  grades: GradeWithDetails[];
  showNewLink?: boolean;
}

export function GradeList({ grades, showNewLink = false }: GradeListProps) {
  if (grades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin notas cargadas</p>
        <p className="text-sm text-slate-400 mt-1">Aún no hay evaluaciones registradas.</p>
        {showNewLink && (
          <Link
            href="/director/grades/new"
            className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
          >
            + Cargar nota
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {grades.map((g) => {
          const score = parseFloat(g.score);
          return (
            <Link
              key={g.id}
              href={`/director/grades/${g.id}`}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{g.studentName}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{g.courseName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABELS[g.evaluationType] ?? g.evaluationType}</p>
              </div>
              <div className="ml-3 shrink-0 flex items-center gap-2">
                <Badge variant={scoreVariant(score)} dot={false}>{score.toFixed(1)}</Badge>
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
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Alumno</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Curso</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Tipo</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Nota (1-10)</th>
              <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden lg:table-cell">Fecha</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grades.map((g) => {
              const score = parseFloat(g.score);
              return (
                <tr key={g.id} className="hover:bg-brand-50 transition-colors relative group cursor-pointer">
                  <td className="py-3.5 pr-4">
                    <p className="font-medium text-slate-900">{g.studentName}</p>
                    <p className="text-xs text-slate-400 font-mono">{g.studentDni}</p>
                  </td>
                  <td className="py-3.5 pr-4 hidden md:table-cell">
                    <p className="text-slate-700">{g.courseName}</p>
                    <p className="text-xs text-slate-400">{LEVEL_LABELS[g.courseLevel] ?? g.courseLevel}</p>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-600">{TYPE_LABELS[g.evaluationType] ?? g.evaluationType}</td>
                  <td className="py-3.5 pr-4">
                    <Badge variant={scoreVariant(score)} dot={false}>{score.toFixed(1)}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 text-xs hidden lg:table-cell">
                    {new Date(g.evaluatedAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <Link href={`/director/grades/${g.id}`} className="after:absolute after:inset-0 after:content-['']">
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
