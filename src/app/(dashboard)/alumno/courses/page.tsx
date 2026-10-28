import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getServerUser } from "@/lib/auth/helpers";
import { getCoursesByStudentProfile } from "@/modules/courses/services/courses.service";
import { Badge } from "@/components/ui/Badge";
import { LEVEL_LABELS } from "@/lib/level-labels";

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "neutral" | "info" }> = {
  active: { label: "Activo", variant: "success" },
  inactive: { label: "Inactivo", variant: "neutral" },
  completed: { label: "Finalizado", variant: "info" },
};

const SHORTCUTS = [
  { label: "Mis notas", href: "/alumno/grades" },
  { label: "Asistencia", href: "/alumno/attendance" },
  { label: "Material", href: "/alumno/documents" },
  { label: "Autoevaluaciones", href: "/alumno/assessments" },
];

export default async function AlumnoCoursesPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const myCourses = await getCoursesByStudentProfile(user.id);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Mis cursos</h2>
        <p className="text-sm text-slate-400 mt-0.5">Cursos en los que estás inscripto</p>
      </div>

      {myCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
          <p className="text-sm text-slate-400">Todavía no estás inscripto en ningún curso. Consultá con la administración.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myCourses.map((c) => {
            const status = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "neutral" as const };
            return (
              <section key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" aria-label={c.name}>
                <div className="flex flex-wrap items-start justify-between gap-2 px-5 py-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Inscripto desde el {new Date(c.enrolledAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="info" dot={false}>{LEVEL_LABELS[c.level] ?? c.level}</Badge>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Horario</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{c.schedule}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Aula</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">{c.classroom ?? "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-slate-500">Docente</dt>
                    <dd className="font-medium text-slate-800 mt-0.5">
                      {c.teacherName ?? <span className="text-slate-400">Sin asignar</span>}
                    </dd>
                    {c.teacherEmail && <dd className="text-xs text-slate-500 truncate">{c.teacherEmail}</dd>}
                  </div>
                </dl>

                <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
                  {SHORTCUTS.map((s) => (
                    <Link key={s.href} href={s.href} className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1">
                      {s.label} <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
