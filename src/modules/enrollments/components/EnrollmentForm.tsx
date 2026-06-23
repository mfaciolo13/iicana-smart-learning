"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import type { StudentListItem } from "@/modules/students/types";
import type { CourseListItem } from "@/modules/courses/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createEnrollmentSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";

type FormValues = z.infer<typeof createEnrollmentSchema>;

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Principiante",
  elementary: "Elemental",
  pre_intermediate: "Pre-intermedio",
  intermediate: "Intermedio",
  upper_intermediate: "Upper-intermedio",
  advanced: "Avanzado",
};

interface EnrollmentFormProps {
  students: StudentListItem[];
  courses: CourseListItem[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaultStudentId?: string;
  defaultCourseId?: string;
}

export function EnrollmentForm({ students, courses, action, defaultStudentId, defaultCourseId }: EnrollmentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(createEnrollmentSchema),
    defaultValues: {
      studentId: defaultStudentId ?? "",
      courseId: defaultCourseId ?? "",
    },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  const available = courses.filter(
    (c) => c.status === "active" && c.maxCapacity - c.enrollmentCount > 0
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <Card title="Datos de la inscripción" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Alumno" required id="studentId" error={errors.studentId?.message}>
            <Select id="studentId" {...register("studentId")}>
              <option value="" disabled>Seleccioná un alumno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.dni}</option>
              ))}
            </Select>
          </Field>

          <Field label="Curso" required id="courseId" error={errors.courseId?.message}>
            {available.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No hay cursos activos con cupo disponible.</p>
            ) : (
              <Select id="courseId" {...register("courseId")}>
                <option value="" disabled>Seleccioná un curso</option>
                {available.map((c) => {
                  const spots = c.maxCapacity - c.enrollmentCount;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} — {LEVEL_LABELS[c.level] ?? c.level} ({spots} lugar{spots !== 1 ? "es" : ""} disponible{spots !== 1 ? "s" : ""})
                    </option>
                  );
                })}
              </Select>
            )}
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-3">Solo se muestran cursos activos con cupo disponible.</p>
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
