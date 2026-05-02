import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/helpers";
import { getAttemptResult } from "@/modules/assessments/services/assessments.service";
import type { QuizQuestion } from "@/modules/assessments/types";

const OPTION_LETTERS = ["A", "B", "C", "D"];

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-2">🏆</div>
        <p className="text-4xl font-black text-emerald-600">{score}%</p>
        <p className="text-sm font-medium text-emerald-600 mt-1">¡Excelente!</p>
      </div>
    );
  }
  if (score >= 60) {
    return (
      <div className="text-center">
        <div className="text-5xl mb-2">👍</div>
        <p className="text-4xl font-black text-amber-600">{score}%</p>
        <p className="text-sm font-medium text-amber-600 mt-1">¡Bien! Seguí practicando.</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="text-5xl mb-2">💪</div>
      <p className="text-4xl font-black text-red-500">{score}%</p>
      <p className="text-sm font-medium text-red-500 mt-1">¡Podés mejorar! Seguí intentando.</p>
    </div>
  );
}

export default async function AttemptResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await getAttemptResult(id, user.id);
  if (!result) notFound();

  const questions = result.questions as QuizQuestion[];
  const answers = result.answers as number[];

  const correctCount = answers.filter((ans, i) => questions[i] && ans === questions[i].correct).length;

  return (
    <div>
      <div className="mb-6">
        <Link href="/alumno/assessments" className="text-sm text-slate-400 hover:text-slate-600 mb-1 block">
          ← Mis evaluaciones
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">Resultado</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {result.courseName} · {result.weekLabel}
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Score card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 mb-6 text-center">
          <ScoreBadge score={result.score} />
          <p className="text-sm text-slate-500 mt-4">
            {correctCount} de {questions.length} respuestas correctas
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Completada el {new Date(result.completedAt).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Review */}
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Revisión detallada
        </h3>

        <div className="space-y-4">
          {questions.map((q, qi) => {
            const chosen = answers[qi];
            const isCorrect = chosen === q.correct;
            return (
              <div
                key={qi}
                className={`bg-white rounded-xl border shadow-sm p-5 ${
                  isCorrect ? "border-emerald-200" : "border-red-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-slate-900 flex-1">{q.question}</p>
                  <span className={`shrink-0 text-lg ${isCorrect ? "text-emerald-500" : "text-red-500"}`}>
                    {isCorrect ? "✓" : "✗"}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {q.options.map((opt, oi) => {
                    const isChosen = oi === chosen;
                    const isCorrectOpt = oi === q.correct;
                    let cls = "flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ";
                    if (isCorrectOpt) cls += "bg-emerald-50 border-emerald-200 text-emerald-800 font-medium";
                    else if (isChosen) cls += "bg-red-50 border-red-200 text-red-700";
                    else cls += "bg-slate-50 border-slate-100 text-slate-500";
                    return (
                      <div key={oi} className={cls}>
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isCorrectOpt ? "bg-emerald-400 text-white" : isChosen ? "bg-red-400 text-white" : "bg-slate-200 text-slate-500"
                        }`}>
                          {OPTION_LETTERS[oi]}
                        </span>
                        {opt}
                        {isCorrectOpt && <span className="ml-auto text-emerald-600">✓</span>}
                        {isChosen && !isCorrectOpt && <span className="ml-auto text-red-500">Tu respuesta</span>}
                      </div>
                    );
                  })}
                </div>

                <div className={`p-3 rounded-lg text-xs ${
                  isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  <span className="font-semibold">Explicación: </span>{q.explanation}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/alumno/assessments"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            Ver todas mis evaluaciones
          </Link>
        </div>
      </div>
    </div>
  );
}
