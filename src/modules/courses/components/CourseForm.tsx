"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CourseWithTeacher } from "../types";
import type { TeacherListItem } from "@/modules/teachers/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SchedulePicker } from "./SchedulePicker";
import type { ActionResult } from "@/lib/action-result";

const LEVELS = [
  { value: "beginner", label: "Principiante" },
  { value: "elementary", label: "Elemental" },
  { value: "pre_intermediate", label: "Pre-intermedio" },
  { value: "intermediate", label: "Intermedio" },
  { value: "upper_intermediate", label: "Upper-intermedio" },
  { value: "advanced", label: "Avanzado" },
];

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "completed", label: "Finalizado" },
];

interface CourseFormProps {
  course?: CourseWithTeacher;
  teachers: TeacherListItem[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function CourseForm({ course, teachers, action, submitLabel = "Guardar" }: CourseFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isEditing = !!course;

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={course.id} />}

      <Card title="Datos del curso" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre del curso" required id="name">
            <Input id="name" name="name" type="text" required defaultValue={course?.name} placeholder="ej. Inglés Intermedio — Turno Tarde" />
          </Field>

          <Field label="Nivel" required id="level">
            <Select id="level" name="level" required defaultValue={course?.level ?? ""}>
              <option value="" disabled>Seleccioná un nivel</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Horario" required id="schedule" className="sm:col-span-2">
            <SchedulePicker defaultValue={course?.schedule} />
          </Field>

          <Field label="Aula" id="classroom">
            <Input id="classroom" name="classroom" type="text" defaultValue={course?.classroom ?? ""} placeholder="ej. Aula 3" />
          </Field>

          <Field label="Cupo máximo" required id="maxCapacity">
            <Input id="maxCapacity" name="maxCapacity" type="number" required min={1} max={50} defaultValue={course?.maxCapacity ?? 15} />
          </Field>

          <Field label="Docente" id="teacherId">
            <Select id="teacherId" name="teacherId" defaultValue={course?.teacherId ?? ""}>
              <option value="">Sin asignar</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </Select>
          </Field>

          {isEditing && (
            <Field label="Estado" id="status">
              <Select id="status" name="status" defaultValue={course?.status}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/courses" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
