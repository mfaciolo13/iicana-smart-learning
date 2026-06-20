"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import type { GradeWithDetails } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";
import { useFieldErrors } from "@/lib/use-field-errors";

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

interface GradeFormProps {
  enrollments: EnrollmentListItem[];
  grade?: GradeWithDetails;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  cancelHref?: string;
  redirectTo?: string;
}

export function GradeForm({ enrollments, grade, action, submitLabel = "Guardar", cancelHref = "/director/grades", redirectTo }: GradeFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const { fieldErrors, handleChange } = useFieldErrors(state);
  const isEditing = !!grade;
  const [selectedScore, setSelectedScore] = useState<number | null>(grade?.score ? Math.round(parseFloat(String(grade.score))) : null);

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} onChange={handleChange} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={grade.id} />}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      <Card title="Datos de la evaluación" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEditing && (
            <Field label="Alumno / Inscripción" required id="enrollmentId" className="sm:col-span-2" error={fieldErrors.enrollmentId}>
              <Select id="enrollmentId" name="enrollmentId" defaultValue="">
                <option value="" disabled>Seleccioná un alumno</option>
                {enrollments.map((e) => (
                  <option key={e.id} value={e.id}>{e.studentName} — {e.courseName}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Tipo de evaluación" required id="evaluationType" error={fieldErrors.evaluationType}>
            <Select id="evaluationType" name="evaluationType" defaultValue={grade?.evaluationType ?? "parcial"}>
              <option value="" disabled>Seleccioná el tipo</option>
              {EVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Nota (1–10)" required id="score" error={fieldErrors.score}>
            <input type="hidden" name="score" value={selectedScore ?? ""} />
            <div className="flex flex-wrap gap-2 pt-0.5">
              {SCORES.map((n) => {
                const active = selectedScore === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedScore(n)}
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
            {!selectedScore && fieldErrors.score && (
              <p className="text-xs text-danger-500 mt-1">Seleccioná una nota</p>
            )}
          </Field>

          <Field label="Observaciones" id="notes" className="sm:col-span-2" error={fieldErrors.notes}>
            <Textarea id="notes" name="notes" defaultValue={grade?.notes ?? ""} placeholder="Comentarios opcionales sobre la evaluación..." />
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
