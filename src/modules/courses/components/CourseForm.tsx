"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CourseWithTeacher } from "../types";
import type { TeacherListItem } from "@/modules/teachers/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SchedulePicker } from "./SchedulePicker";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";
import { useFieldErrors } from "@/lib/use-field-errors";

const CAPACITIES = Array.from({ length: 15 }, (_, i) => i + 1);

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
  const { fieldErrors, handleChange, formRef } = useFieldErrors(state);
  const isEditing = !!course;
  const [selectedCapacity, setSelectedCapacity] = useState<number>(() => {
    const v = Number(course?.maxCapacity);
    return v >= 1 && v <= 15 ? v : 15;
  });

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} onChange={handleChange} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={course.id} />}

      <Card title="Datos del curso" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre del curso" required id="name" error={fieldErrors.name}>
            <Input id="name" name="name" type="text" defaultValue={course?.name} placeholder="ej. Inglés Intermedio — Turno Tarde" />
          </Field>

          <Field label="Nivel" required id="level" error={fieldErrors.level}>
            <Select id="level" name="level" defaultValue={course?.level ?? ""}>
              <option value="" disabled>Seleccioná un nivel</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Horario"
            required
            id="classDays"
            className="sm:col-span-2"
            error={fieldErrors.classDays ?? fieldErrors.classTime ?? fieldErrors.classDurationMinutes}
          >
            <SchedulePicker
              defaultDays={course?.classDays}
              defaultTime={course?.classTime}
              defaultDuration={course?.classDurationMinutes}
            />
          </Field>

          <Field label="Aula" id="classroom" error={fieldErrors.classroom}>
            <Input id="classroom" name="classroom" type="text" defaultValue={course?.classroom ?? ""} placeholder="ej. Aula 3" />
          </Field>

          <Field label="Cupo máximo" required id="maxCapacity" error={fieldErrors.maxCapacity}>
            <input type="hidden" name="maxCapacity" value={selectedCapacity} />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {CAPACITIES.map((n) => {
                const active = selectedCapacity === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSelectedCapacity(n)}
                    className={cn(
                      "w-9 h-9 rounded-lg border text-sm font-semibold transition-all",
                      active
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-700"
                    )}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Docente" id="teacherId" error={fieldErrors.teacherId}>
            <Select id="teacherId" name="teacherId" defaultValue={course?.teacherId ?? ""}>
              <option value="">Sin asignar</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </Select>
          </Field>

          {isEditing && (
            <Field label="Estado" id="status" error={fieldErrors.status}>
              <Select id="status" name="status" defaultValue={course?.status}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field
            label="Autoevaluación diagnóstica (cada N clases)"
            id="diagnosticFrequency"
            className="sm:col-span-2"
            error={fieldErrors.diagnosticFrequency}
          >
            <Select id="diagnosticFrequency" name="diagnosticFrequency" defaultValue={String(course?.diagnosticFrequency ?? 0)}>
              <option value="0">Desactivada</option>
              <option value="4">Cada 4 clases</option>
              <option value="6">Cada 6 clases</option>
              <option value="8">Cada 8 clases</option>
              <option value="10">Cada 10 clases</option>
              <option value="12">Cada 12 clases</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/director/courses" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
