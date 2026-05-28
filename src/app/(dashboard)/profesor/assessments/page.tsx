import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth/helpers";
import { getAssessmentsForTeacher } from "@/modules/assessments/services/assessments.service";
import { AssessmentList } from "@/modules/assessments/components/AssessmentList";
import { buttonVariants } from "@/components/ui/Button";

export default async function ProfesorAssessmentsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");

  const items = await getAssessmentsForTeacher(user.id);

  const total = items.length;
  const published = items.filter((a) => a.status === "published").length;
  const drafts = items.filter((a) => a.status === "draft").length;
  const totalAttempts = items.reduce((sum, a) => sum + a.attemptCount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Autoevaluaciones IA</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Quizzes semanales generados con inteligencia artificial para tus cursos
          </p>
        </div>
        <Link
          href="/profesor/assessments/new"
          className={buttonVariants({ variant: "primary", size: "sm" })}
        >
          + Nueva evaluación
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: total, color: "text-slate-700" },
          { label: "Publicadas", value: published, color: "text-emerald-600" },
          { label: "Borradores", value: drafts, color: "text-amber-600" },
          { label: "Intentos", value: totalAttempts, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 sm:px-6">
        <AssessmentList assessments={items} basePath="/profesor/assessments" />
      </div>
    </div>
  );
}
