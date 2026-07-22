"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Resolver } from "react-hook-form";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import { surveySchema } from "../schemas";
import { useFormAction } from "@/lib/use-form-action";
import type { ActionResult } from "@/lib/action-result";

type FormValues = z.infer<typeof surveySchema>;

const QUESTIONS = [
  { name: "rating1" as const, label: "¿El docente explica los temas con claridad?" },
  { name: "rating2" as const, label: "¿El docente está disponible para consultas?" },
  { name: "rating3" as const, label: "¿El ritmo de la clase es adecuado?" },
  { name: "rating4" as const, label: "¿Recomendarías este docente a otros alumnos?" },
];

interface SurveyFormProps {
  teacherId: string;
  courseId: string;
  enrollmentId: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function SurveyForm({ teacherId, courseId, enrollmentId, action }: SurveyFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(surveySchema) as Resolver<FormValues>,
    defaultValues: {
      teacherId,
      courseId,
      enrollmentId,
      rating1: undefined,
      rating2: undefined,
      rating3: undefined,
      rating4: undefined,
      comment: "",
    },
  });
  const { register, setValue, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="teacherId" value={teacherId} />
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="enrollmentId" value={enrollmentId} />

      <div className="space-y-6">
        {QUESTIONS.map((q) => (
          <div key={q.name}>
            <StarRating
              name={q.name}
              label={q.label}
              onChange={(v) => setValue(q.name, v, { shouldValidate: true })}
            />
            {errors[q.name] && (
              <p className="text-xs text-red-500 mt-1">{errors[q.name]?.message}</p>
            )}
          </div>
        ))}

        <div>
          <label className="block text-sm text-slate-700 mb-1" htmlFor="comment">
            Comentario (opcional)
          </label>
          <textarea
            id="comment"
            rows={3}
            maxLength={500}
            placeholder="Podés dejar un comentario adicional..."
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            {...register("comment")}
          />
          {errors.comment && <p className="text-xs text-red-500 mt-1">{errors.comment.message}</p>}
          <p className="text-xs text-slate-400 mt-1">Tu respuesta es completamente anónima.</p>
        </div>

        <Button type="submit" variant="primary" loading={isPending} className="w-full justify-center">
          Enviar evaluación
        </Button>
      </div>
    </form>
  );
}
