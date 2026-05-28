import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerUser } from "@/lib/auth/helpers";
import { getAssessmentDetail } from "@/modules/assessments/services/assessments.service";
import { publishAssessmentProfesorAction, archiveAssessmentProfesorAction } from "@/modules/assessments/actions";
import { FormButton } from "@/components/ui/FormButton";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { AssessmentStatus, QuizQuestion } from "@/modules/assessments/types";

const STATUS_CONFIG: Record<AssessmentStatus, { label: string; variant: "info" | "success" | "neutral" | "warning" }> = {
  draft: { label: "Borrador", variant: "warning" },
  published: { label: "Publicado", variant: "success" },
  archived: { label: "Archivado", variant: "neutral" },
};

const OPTION_LETTERS = ["A", "B", "C", "D"];

export default async function ProfesorAssessmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect("/login");

  const detail = await getAssessmentDetail(id);
  if (!detail) notFound();

  const cfg = STATUS_CONFIG[detail.status];
  const questions = detail.questions as unknown as QuizQuestion[];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link
            href="/profesor/assessments"
            className="text-sm text-slate-400 hover:text-slate-600 mb-1 inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Autoevaluaciones
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">{detail.topic}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {detail.courseName} · {detail.weekLabel}
          </p>
        </div>
        <Badge variant={cfg.variant} dot={false}>{cfg.label}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Preguntas generadas ({questions.length})
          </h3>
          {questions.map((q, qi) => (
            <Card key={qi} padding="md">
              <p className="text-xs font-medium text-slate-400 mb-1">Pregunta {qi + 1}</p>
              <p className="text-sm font-semibold text-slate-900 mb-4">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${
                      oi === q.correct
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium"
                        : "bg-slate-50 border-slate-100 text-slate-600"
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      oi === q.correct ? "bg-emerald-400 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      {OPTION_LETTERS[oi]}
                    </span>
                    {opt}
                    {oi === q.correct && <span className="ml-auto text-emerald-600 text-xs">✓ Correcta</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  <span className="font-semibold">Explicación:</span> {q.explanation}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card title="Estadísticas" padding="md">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-400">Estado</dt>
                <dd><Badge variant={cfg.variant} dot={false}>{cfg.label}</Badge></dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Curso</dt>
                <dd className="text-slate-700 text-right">{detail.courseName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Preguntas</dt>
                <dd className="text-slate-700">{questions.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">Intentos</dt>
                <dd className="text-slate-700">{detail.attemptCount}</dd>
              </div>
              {detail.avgScore !== null && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Prom. puntaje</dt>
                  <dd className="text-slate-700 font-semibold">{detail.avgScore}%</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-slate-400">Creada</dt>
                <dd className="text-slate-700">
                  {new Date(detail.createdAt).toLocaleDateString("es-AR")}
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Acciones" padding="md">
            <div className="space-y-3">
              {detail.status === "draft" && (
                <>
                  <FormButton
                    action={publishAssessmentProfesorAction}
                    fields={{ id: detail.id }}
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                  >
                    Publicar evaluación
                  </FormButton>
                  <p className="text-xs text-slate-400 text-center">
                    Revisá las preguntas antes de publicar.
                  </p>
                </>
              )}

              {detail.status === "published" && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">
                    Los alumnos del curso pueden ver y responder esta evaluación.
                  </p>
                  <FormButton
                    action={archiveAssessmentProfesorAction}
                    fields={{ id: detail.id }}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center"
                  >
                    Archivar
                  </FormButton>
                </div>
              )}

              {detail.status === "archived" && (
                <p className="text-xs text-slate-500">
                  Esta evaluación está archivada y no es visible para los alumnos.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
