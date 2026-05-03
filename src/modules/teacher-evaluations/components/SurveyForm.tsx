"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";

const QUESTIONS = [
  { name: "rating1", label: "¿El docente explica los temas con claridad?" },
  { name: "rating2", label: "¿El docente está disponible para consultas?" },
  { name: "rating3", label: "¿El ritmo de la clase es adecuado?" },
  { name: "rating4", label: "¿Recomendarías este docente a otros alumnos?" },
];

interface SurveyFormProps {
  teacherId: string;
  courseId: string;
  enrollmentId: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function SurveyForm({ teacherId, courseId, enrollmentId, action }: SurveyFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="teacherId" value={teacherId} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />

      <div className="space-y-6">
        {QUESTIONS.map((q) => (
          <StarRating key={q.name} name={q.name} label={q.label} />
        ))}

        <div>
          <label className="block text-sm text-slate-700 mb-1" htmlFor="comment">
            Comentario (opcional)
          </label>
          <textarea
            id="comment"
            name="comment"
            rows={3}
            maxLength={500}
            placeholder="Podés dejar un comentario adicional..."
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">Tu respuesta es completamente anónima.</p>
        </div>

        <Button type="submit" variant="primary" disabled={isPending} className="w-full justify-center">
          {isPending ? "Enviando..." : "Enviar evaluación"}
        </Button>
      </div>
    </form>
  );
}
