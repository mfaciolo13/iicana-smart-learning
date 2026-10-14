"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { submitAttemptAction, checkAnswerAction } from "../actions";
import type { PublicQuizQuestion, AnswerFeedback } from "../types";

const OPTION_LETTERS = ["A", "B", "C", "D"];

interface QuizPlayerProps {
  assessmentId: string;
  questions: PublicQuizQuestion[];
  weekLabel: string;
  topic: string;
  courseName: string;
}

export function QuizPlayer({ assessmentId, questions, weekLabel, topic, courseName }: QuizPlayerProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<(number | null)[]>(Array(questions.length).fill(null));
  // Feedback devuelto por el servidor al confirmar cada pregunta (SCRUM-301).
  const [feedback, setFeedback] = useState<(AnswerFeedback | null)[]>(Array(questions.length).fill(null));
  const [checking, startCheck] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const q = questions[current];
  const chosenIndex = selected[current];
  const currentFeedback = feedback[current];
  const isConfirmed = currentFeedback !== null;
  const correctIndex = currentFeedback?.correctIndex ?? -1;
  const isCorrect = currentFeedback?.correct ?? false;

  const answeredCount = feedback.filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;
  const progress = (answeredCount / questions.length) * 100;

  function pick(idx: number) {
    if (isConfirmed) return;
    setSelected((prev) => prev.map((v, i) => (i === current ? idx : v)));
  }

  function confirm() {
    if (chosenIndex === null || isConfirmed || checking) return;
    setError(null);
    const questionIndex = current;
    startCheck(async () => {
      const result = await checkAnswerAction(assessmentId, questionIndex, chosenIndex);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setFeedback((prev) => prev.map((v, i) => (i === questionIndex ? result : v)));
    });
  }

  function next() {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
  }

  function prev() {
    if (current > 0) setCurrent((c) => c - 1);
  }

  function handleSubmit() {
    setError(null);
    const answersPayload = selected.map((v) => (v === null ? 0 : v));
    const formData = new FormData();
    formData.set("assessmentId", assessmentId);
    formData.set("answers", JSON.stringify(answersPayload));
    startSubmit(async () => {
      // Si el envío falla la action devuelve { error } (si sale bien, redirige al resultado).
      const result = await submitAttemptAction(undefined, formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">{courseName} · {weekLabel}</p>
        <h2 className="text-xl font-bold text-slate-900">{topic}</h2>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Pregunta {current + 1} de {questions.length}</span>
          <span>{answeredCount}/{questions.length} respondidas</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            }}
          />
        </div>

        {/* Question dot nav */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={[
                "w-7 h-7 rounded-full text-xs font-bold transition-all",
                i === current
                  ? "text-white shadow-md scale-110"
                  : feedback[i]
                    ? feedback[i]!.correct
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-600"
                    : "bg-slate-100 text-slate-400 hover:bg-slate-200",
              ].join(" ")}
              style={i === current ? { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" } : undefined}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
        <p className="text-sm font-medium text-slate-400 mb-3">
          Pregunta {current + 1}
        </p>
        <p className="text-base font-semibold text-slate-900 leading-relaxed mb-6">
          {q.question}
        </p>

        <div className="space-y-3">
          {q.options.map((option, i) => {
            const isChosen = chosenIndex === i;
            const isCorrectOption = i === correctIndex;

            let optionClass = "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ";
            let letterClass = "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ";

            if (!isConfirmed) {
              if (isChosen) {
                optionClass += "border-blue-400 bg-blue-50";
                letterClass += "bg-blue-400 text-white";
              } else {
                optionClass += "border-slate-200 hover:border-blue-300 hover:bg-blue-50/50";
                letterClass += "bg-slate-100 text-slate-500";
              }
            } else {
              if (isCorrectOption) {
                optionClass += "border-emerald-400 bg-emerald-50";
                letterClass += "bg-emerald-400 text-white";
              } else if (isChosen && !isCorrectOption) {
                optionClass += "border-red-400 bg-red-50";
                letterClass += "bg-red-400 text-white";
              } else {
                optionClass += "border-slate-200 opacity-50 cursor-default";
                letterClass += "bg-slate-100 text-slate-400";
              }
            }

            return (
              <div
                key={i}
                role="button"
                tabIndex={isConfirmed ? -1 : 0}
                onClick={() => pick(i)}
                onKeyDown={(e) => e.key === "Enter" && pick(i)}
                className={optionClass}
              >
                <span className={letterClass}>{OPTION_LETTERS[i]}</span>
                <span className="text-sm text-slate-800">{option}</span>
                {isConfirmed && isCorrectOption && (
                  <span className="ml-auto text-emerald-600 text-lg">✓</span>
                )}
                {isConfirmed && isChosen && !isCorrectOption && (
                  <span className="ml-auto text-red-500 text-lg">✗</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Feedback box */}
        {isConfirmed && (
          <div
            className={`mt-5 p-4 rounded-xl border text-sm ${
              isCorrect
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <p className="font-semibold mb-1">
              {isCorrect ? "¡Excelente! 🎉" : "Casi... 💪"}
            </p>
            <p className="leading-relaxed">{currentFeedback?.explanation}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={prev}
          disabled={current === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Anterior
        </button>

        <div className="flex items-center gap-3">
          {!isConfirmed && chosenIndex !== null && (
            <button
              type="button"
              onClick={confirm}
              disabled={checking}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              {checking ? "Verificando..." : "Confirmar"}
            </button>
          )}

          {isConfirmed && current < questions.length - 1 && (
            <button
              type="button"
              onClick={next}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 inline-flex items-center gap-1"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              Siguiente <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Submit section */}
      {allAnswered && (
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-2xl text-center">
          <p className="text-base font-semibold text-slate-800 mb-1">¡Respondiste todas las preguntas!</p>
          <p className="text-sm text-slate-500 mb-4">Enviá tus respuestas para ver tu puntaje final.</p>
          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            {submitting ? "Enviando..." : "Enviar evaluación 🚀"}
          </button>
        </div>
      )}
    </div>
  );
}
