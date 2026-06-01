"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

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
            {(() => {
              const available = courses.filter(
                (c) => c.status === "active" && c.maxCapacity - c.enrollmentCount > 0
              );
              if (available.length === 0) {
                return (
                  <p className="text-sm text-slate-400 py-2">
                    No hay cursos activos con cupo disponible.
                  </p>
                );
              }
              return (
                <Select id="courseId" name="courseId" required defaultValue={defaultCourseId ?? ""}>
                  <option value="" disabled>Seleccioná un curso</option>
                  {available.map((c) => {
                    const spots = c.maxCapacity - c.enrollmentCount;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} — {LEVEL_LABELS[c.level] ?? c.level}{" "}
                        ({spots} lugar{spots !== 1 ? "es" : ""} disponible{spots !== 1 ? "s" : ""})
                      </option>
                    );
                  })}
                </Select>
              );
            })()}
          </Field>
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Solo se muestran cursos activos con cupo disponible.
        </p>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/director/enrollments" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Inscribir alumno
        </Button>
      </div>
    </form>
  );
}
