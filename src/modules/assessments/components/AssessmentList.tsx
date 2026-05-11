import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { AssessmentListItem, AssessmentStatus } from "../types";

const STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: "info" | "success" | "neutral" | "warning" }> = {
  draft: { label: "Borrador", variant: "warning" },
  published: { label: "Publicado", variant: "success" },
  archived: { label: "Archivado", variant: "neutral" },
};

interface AssessmentListProps {
  assessments: AssessmentListItem[];
}

export function AssessmentList({ assessments }: AssessmentListProps) {
  if (assessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.346A3.979 3.979 0 0114 16v1a2 2 0 01-2 2H10a2 2 0 01-2-2v-1c0-.728-.294-1.35-.764-1.814l-.347-.347z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Sin evaluaciones</p>
        <p className="text-sm text-slate-400 mt-1">Generá la primera con IA.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {assessments.map((a) => {
          const cfg = STATUS_CONFIG[a.status];
          return (
            <Link
              key={a.id}
              href={`/admin/assessments/${a.id}`}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{a.topic}</p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{a.courseName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.weekLabel}</p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Badge variant={cfg.variant} dot={false}>{cfg.label}</Badge>
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
          <tr className="border-b-2 border-slate-200">
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Evaluación</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden sm:table-cell">Curso</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4">Estado</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Preguntas</th>
            <th className="text-left text-xs font-medium uppercase tracking-wide text-slate-500 py-3 pr-4 hidden md:table-cell">Intentos</th>
            <th className="py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assessments.map((a) => {
            const cfg = STATUS_CONFIG[a.status];
            return (
              <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium text-slate-900 truncate max-w-[200px]">{a.topic}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.weekLabel}</p>
                </td>
                <td className="py-3 pr-4 text-slate-500 hidden sm:table-cell">{a.courseName}</td>
                <td className="py-3 pr-4">
                  <Badge variant={cfg.variant} dot={false}>{cfg.label}</Badge>
                </td>
                <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">{a.questionCount}</td>
                <td className="py-3 pr-4 text-slate-500 hidden md:table-cell">{a.attemptCount}</td>
                <td className="py-3 text-right">
                  <Link href={`/admin/assessments/${a.id}`} className="text-brand-700 hover:underline text-xs font-medium inline-flex items-center gap-1">
                    Ver <ArrowRight className="w-3.5 h-3.5" />
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
