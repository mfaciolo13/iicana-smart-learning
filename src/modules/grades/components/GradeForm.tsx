"use client";

import Link from "next/link";
import type { EnrollmentListItem } from "@/modules/enrollments/types";
import type { GradeWithDetails } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action: (formData: FormData) => Promise<any>;
  submitLabel?: string;
}

export function GradeForm({ enrollments, grade, action, submitLabel = "Guardar" }: GradeFormProps) {
  const isEditing = !!grade;

  return (
    <form action={action} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={grade.id} />}

      <Card title="Datos de la evaluación" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!isEditing && (
            <Field label="Alumno / Inscripción" required id="enrollmentId" className="sm:col-span-2">
              <Select id="enrollmentId" name="enrollmentId" required defaultValue="">
                <option value="" disabled>Seleccioná un alumno</option>
                {enrollments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.studentName} — {e.courseName}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Tipo de evaluación" required id="evaluationType">
            <Select
              id="evaluationType"
              name="evaluationType"
              required
              defaultValue={grade?.evaluationType ?? ""}
            >
              <option value="" disabled>Seleccioná el tipo</option>
              {EVAL_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Nota (1–10)" required id="score">
            <Input
              id="score"
              name="score"
              type="number"
              required
              min={1}
              max={10}
              step={0.5}
              defaultValue={grade?.score ?? ""}
              placeholder="ej. 8.5"
            />
          </Field>

          <Field label="Observaciones" id="notes" className="sm:col-span-2">
            <Textarea
              id="notes"
              name="notes"
              defaultValue={grade?.notes ?? ""}
              placeholder="Comentarios opcionales sobre la evaluación..."
            />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/grades" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
