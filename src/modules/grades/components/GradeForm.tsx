"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import type { GradeWithDetails } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { createGradeSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function scoreColor(n: number) {
  if (n <= 4) return "border-red-300 text-red-700 bg-red-50 hover:bg-red-100";
  if (n <= 6) return "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100";
  if (n <= 8) return "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100";
  return "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100";
}

function scoreColorActive(n: number) {
  if (n <= 4) return "border-red-500 bg-red-500 text-white";
  if (n <= 6) return "border-amber-500 bg-amber-500 text-white";
  if (n <= 8) return "border-blue-500 bg-blue-500 text-white";
  return "border-emerald-500 bg-emerald-500 text-white";
}

const EVAL_TYPES = [
  { value: "parcial", label: "Parcial" },
  { value: "final", label: "Final" },
  { value: "oral", label: "Oral" },
  { value: "homework", label: "Tarea" },
  { value: "quiz", label: "Quiz" },
];

// Edit schema: enrollmentId not shown, everything optional
const editClientSchema = createGradeSchema.omit({ enrollmentId: true }).partial();
type CreateValues = z.infer<typeof createGradeSchema>;

interface GradeFormProps {
  enrollments: EnrollmentListItem[];
  grade?: GradeWithDetails;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  cancelHref?: string;
  redirectTo?: string;
}

export function GradeForm({ enrollments, grade, action, submitLabel = "Guardar", cancelHref = "/director/grades", redirectTo }: GradeFormProps) {
  const isEditing = !!grade;
  const initialScore = grade?.score ? Math.round(parseFloat(String(grade.score))) : undefined;

  const form = useForm<CreateValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? editClientSchema : createGradeSchema) as any,
    defaultValues: {
      enrollmentId: "",
      evaluationType: (grade?.evaluationType ?? "parcial") as CreateValues["evaluationType"],
      score: initialScore,
      notes: grade?.notes ?? "",
    },
  });
  const { register, control, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={grade.id} />}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <Card title="Datos de la evaluación" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEditing && (
            <Field label="Alumno / Inscripción" required id="enrollmentId" className="sm:col-span-2" error={errors.enrollmentId?.message}>
              <Select id="enrollmentId" {...register("enrollmentId")} defaultValue="">
                <option value="" disabled>Seleccioná un alumno</option>
                {enrollments.map((e) => (
                  <option key={e.id} value={e.id}>{e.studentName} — {e.courseName}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Tipo de evaluación" required id="evaluationType" error={errors.evaluationType?.message}>
            <Select id="evaluationType" {...register("evaluationType")}>
              {EVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Controller
            name="score"
            control={control}
            render={({ field }) => (
              <Field label="Nota (1–10)" required id="score" error={errors.score?.message}>
                <input type="hidden" name="score" value={field.value ?? ""} />
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {SCORES.map((n) => {
                    const active = field.value === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => field.onChange(n)}
                        className={cn(
                          "w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all",
                          active ? scoreColorActive(n) : scoreColor(n)
                        )}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}
          />

          <Field label="Observaciones" id="notes" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea id="notes" placeholder="Comentarios opcionales sobre la evaluación..." {...register("notes")} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
