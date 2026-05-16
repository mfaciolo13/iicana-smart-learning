import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

const QUESTIONS = [
  "Claridad al explicar",
  "Disponibilidad para consultas",
  "Ritmo de la clase",
  "Recomendación general",
];

function RatingBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "bg-emerald-400" : value >= 3 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-600 w-52 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700 w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-lg ${s <= filled ? "text-amber-400" : "text-slate-200"}`}>★</span>
      ))}
    </span>
  );
}

export default async function TeacherEvalDetailPage({
  params,
}: {
  params: Promise<{ teacherId: string }>;
}) {
  const { teacherId } = await params;

  const supabase = await createClient();

  const [{ data: teacherRow }, { data: surveyRows }, { data: obsRows }] = await Promise.all([
    supabase
      .from("teachers")
      .select("id, profiles(full_name)")
      .eq("id", teacherId)
      .single(),
    supabase
      .from("teacher_surveys")
      .select("id, rating1, rating2, rating3, rating4, comment")
      .eq("teacher_id", teacherId),
    supabase
      .from("class_observations")
      .select("id, observed_at, overall_rating, observations, strengths, improvements, courses(name), profiles!observed_by(full_name)")
      .eq("teacher_id", teacherId)
      .order("observed_at"),
  ]);

  if (!teacherRow) notFound();

  type ProfileRaw = { full_name: string } | null;
  const teacherName = (teacherRow.profiles as unknown as ProfileRaw)?.full_name ?? "";

  const surveys = surveyRows ?? [];
  const surveyAggregate =
    surveys.length > 0
      ? {
          avg1: Math.round((surveys.reduce((s, r) => s + r.rating1, 0) / surveys.length) * 10) / 10,
          avg2: Math.round((surveys.reduce((s, r) => s + r.rating2, 0) / surveys.length) * 10) / 10,
          avg3: Math.round((surveys.reduce((s, r) => s + r.rating3, 0) / surveys.length) * 10) / 10,
          avg4: Math.round((surveys.reduce((s, r) => s + r.rating4, 0) / surveys.length) * 10) / 10,
          total: surveys.length,
          recentComments: surveys
            .filter((s) => s.comment)
            .slice(-5)
            .map((s) => s.comment as string),
        }
      : null;

  type ObsCourseRaw = { name: string } | null;
  type ObsProfileRaw = { full_name: string } | null;

  const observations = (obsRows ?? []).map((o) => ({
    id: o.id,
    observedAt: o.observed_at,
    overallRating: o.overall_rating,
    observations: o.observations,
    strengths: o.strengths as string | null,
    improvements: o.improvements as string | null,
    courseName: (o.courses as unknown as ObsCourseRaw)?.name ?? "",
    observerName: (o.profiles as unknown as ObsProfileRaw)?.full_name ?? "—",
  }));

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/teacher-evaluations" className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Evaluaciones
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">{teacherName}</h2>
        <p className="text-sm text-slate-400 mt-0.5">Informe de evaluación docente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Survey aggregate */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">
            Encuestas anónimas
            {surveyAggregate && (
              <span className="ml-2 text-xs font-normal text-slate-400">({surveyAggregate.total} respuesta{surveyAggregate.total !== 1 ? "s" : ""})</span>
            )}
          </h3>

          {!surveyAggregate ? (
            <p className="text-sm text-slate-400">Sin encuestas registradas aún.</p>
          ) : (
            <div className="space-y-4">
              {QUESTIONS.map((q, i) => (
                <RatingBar key={q} label={q} value={[surveyAggregate.avg1, surveyAggregate.avg2, surveyAggregate.avg3, surveyAggregate.avg4][i]} />
              ))}

              {surveyAggregate.recentComments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Comentarios recientes</p>
                  <ul className="space-y-2">
                    {surveyAggregate.recentComments.map((c, i) => (
                      <li key={i} className="text-sm text-slate-600 italic">&ldquo;{c}&rdquo;</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-800">
              Observaciones de clase
              <span className="ml-2 text-xs font-normal text-slate-400">({observations.length})</span>
            </h3>
            <Link
              href={`/admin/teacher-evaluations/new`}
              className="text-xs text-brand-700 hover:underline"
            >
              + Nueva
            </Link>
          </div>

          {observations.length === 0 ? (
            <p className="text-sm text-slate-400">Sin observaciones registradas.</p>
          ) : (
            <div className="space-y-5">
              {observations.map((obs) => (
                <div key={obs.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-xs font-medium text-slate-700">
                        {new Date(obs.observedAt).toLocaleDateString("es-AR")} · {obs.courseName}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">por {obs.observerName}</p>
                    </div>
                    <Stars value={obs.overallRating} />
                  </div>
                  <p className="text-sm text-slate-600">{obs.observations}</p>
                  {obs.strengths && (
                    <p className="text-xs text-emerald-700 mt-1.5">
                      <span className="font-medium">Fortalezas:</span> {obs.strengths}
                    </p>
                  )}
                  {obs.improvements && (
                    <p className="text-xs text-amber-700 mt-1">
                      <span className="font-medium">Mejoras:</span> {obs.improvements}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
