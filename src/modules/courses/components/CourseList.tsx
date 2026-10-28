import Link from "next/link";
import { Eye, ChevronRight } from "lucide-react";
import type { CourseListItem } from "../types";
import { Badge } from "@/components/ui/Badge";
import { Th, type SortContext } from "@/components/ui/TableControls";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "info" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  completed: { label: "Finalizado", variant: "info" },
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-inter.",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-inter.",
  advanced: "Avanzado",
};

interface CourseListProps {
  courses: CourseListItem[];
  /** Si se pasa, los encabezados ordenan el listado (?sort=&dir=). */
  sort?: SortContext;
  /** Ruta del listado; el detalle de cada curso cuelga de acá. */
  basePath?: string;
  /** false para el administrativo: ve los cursos pero no los crea. */
  canManage?: boolean;
}

export function CourseList({ courses, sort, basePath = "/director/courses", canManage = true }: CourseListProps) {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <p className="text-base font-semibold text-slate-700">Aún no hay cursos cargados</p>
        {canManage && (
          <>
            <p className="text-sm text-slate-400 mt-1">Empezá creando el primero.</p>
            <Link
              href={`${basePath}/new`}
              className="mt-4 inline-flex items-center gap-1 px-4 py-2 text-sm bg-brand-700 text-white rounded-lg hover:bg-brand-800 transition-colors font-medium"
            >
              + Nuevo curso
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {courses.map((course) => {
          const statusCfg = STATUS_CONFIG[course.status] ?? { label: course.status, variant: "neutral" as const };
          const isFull = course.enrollmentCount >= course.maxCapacity;
          return (
            <Link
              key={course.id}
              href={`${basePath}/${course.id}`}
              className="block p-4 bg-white rounded-xl border border-slate-100 hover:border-brand-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{course.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{course.schedule}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{course.teacherName ?? "Sin docente"}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  <span className={`text-xs font-medium ${isFull ? "text-red-600" : "text-slate-500"}`}>
                    {course.enrollmentCount}/{course.maxCapacity}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <Badge variant="info" dot={false}>{LEVEL_LABELS[course.level] ?? course.level}</Badge>
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
              <Th label="Curso" field="name" sort={sort} />
              <Th label="Nivel" field="level" sort={sort} />
              <Th label="Horario" field="schedule" sort={sort} className="hidden md:table-cell" />
              <Th label="Docente" field="teacher" sort={sort} className="hidden lg:table-cell" />
              <Th label="Cupo" field="capacity" sort={sort} />
              <Th label="Estado" field="status" sort={sort} />
              <th className="py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {courses.map((course) => {
              const statusCfg = STATUS_CONFIG[course.status] ?? { label: course.status, variant: "neutral" as const };
              const isFull = course.enrollmentCount >= course.maxCapacity;
              return (
                <tr key={course.id} className="hover:bg-brand-50 transition-colors relative group cursor-pointer">
                  <td className="py-3.5 pr-4 font-medium text-slate-900">{course.name}</td>
                  <td className="py-3.5 pr-4">
                    <Badge variant="info" dot={false}>{LEVEL_LABELS[course.level] ?? course.level}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-slate-500 text-xs hidden md:table-cell">{course.schedule}</td>
                  <td className="py-3.5 pr-4 text-slate-500 hidden lg:table-cell">
                    {course.teacherName ?? <span className="text-slate-400">Sin asignar</span>}
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className={`text-xs font-medium ${isFull ? "text-red-600" : "text-slate-600"}`}>
                      {course.enrollmentCount}/{course.maxCapacity}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4">
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  </td>
                  <td className="py-3.5 pr-4 text-right">
                    <Link href={`${basePath}/${course.id}`} className="after:absolute after:inset-0 after:content-['']">
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
