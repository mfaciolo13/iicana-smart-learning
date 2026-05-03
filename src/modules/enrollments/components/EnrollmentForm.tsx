"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { StudentListItem } from "@/modules/students/types";
import type { CourseListItem } from "@/modules/courses/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

interface EnrollmentFormProps {
  students: StudentListItem[];
  courses: CourseListItem[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultStudentId?: string;
  defaultCourseId?: string;
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

export function EnrollmentForm({ students, courses, action, defaultStudentId, defaultCourseId }: EnrollmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Datos de la inscripción" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Alumno" required id="studentId">
            <Select id="studentId" name="studentId" required defaultValue={defaultStudentId ?? ""}>
              <option value="" disabled>Seleccioná un alumno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.dni}</option>
              ))}
            </Select>
          </Field>

          <Field label="Curso" required id="courseId">
            <Select id="courseId" name="courseId" required defaultValue={defaultCourseId ?? ""}>
              <option value="" disabled>Seleccioná un curso</option>
              {courses
                .filter((c) => c.status === "active")
                .map((c) => {
                  const available = c.maxCapacity - c.enrollmentCount;
                  const isFull = available <= 0;
                  return (
                    <option key={c.id} value={c.id} disabled={isFull}>
                      {c.name} — {LEVEL_LABELS[c.level] ?? c.level}{" "}
                      {isFull ? "(Sin cupo)" : `(${available} lugar${available !== 1 ? "es" : ""} disponible${available !== 1 ? "s" : ""})`}
                    </option>
                  );
                })}
            </Select>
          </Field>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Solo se muestran cursos activos con cupo disponible.
        </p>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/enrollments" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Inscribir alumno
        </Button>
      </div>
    </form>
  );
}
