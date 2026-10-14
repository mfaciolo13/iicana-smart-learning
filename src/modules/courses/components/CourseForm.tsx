"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import type { CourseWithTeacher } from "../types";
import type { TeacherListItem } from "@/modules/teachers/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SchedulePicker } from "./SchedulePicker";
import { cn } from "@/lib/cn";
import { createCourseSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";

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

// Edit schema: all optional + status field
const editClientSchema = createCourseSchema.partial();
type CreateValues = z.infer<typeof createCourseSchema>;

interface CourseFormProps {
  course?: CourseWithTeacher;
  teachers: TeacherListItem[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function CourseForm({ course, teachers, action, submitLabel = "Guardar" }: CourseFormProps) {
  const isEditing = !!course;
  const initialCapacity = course?.maxCapacity && Number(course.maxCapacity) >= 1 && Number(course.maxCapacity) <= 15
    ? Number(course.maxCapacity)
    : 15;

  const form = useForm<CreateValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? editClientSchema : createCourseSchema) as any,
    defaultValues: {
      name: course?.name ?? "",
      level: course?.level,
      classroom: course?.classroom ?? "",
      maxCapacity: initialCapacity,
      teacherId: course?.teacherId ?? undefined,
      classDays: course?.classDays ?? [],
      classTime: course?.classTime?.slice(0, 5) ?? "",
      classDurationMinutes: course?.classDurationMinutes ?? 90,
      diagnosticFrequency: course?.diagnosticFrequency ?? 0,
      ...(isEditing && { status: course.status }),
    },
  });
  const { register, control, setValue, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={course.id} />}

      <Card title="Datos del curso" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre del curso" required id="name" error={errors.name?.message}>
            <Input id="name" type="text" placeholder="ej. Inglés Intermedio — Turno Tarde" {...register("name")} />
          </Field>

          <Field label="Nivel" required id="level" error={errors.level?.message}>
            <Select id="level" {...register("level")} defaultValue={course?.level ?? ""}>
              <option value="" disabled>Seleccioná un nivel</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>

          {/* SchedulePicker maneja los inputs que viajan en el FormData y además refleja sus
              valores en react-hook-form para que la validación client-side vea lo mismo. */}
          <Field
            label="Horario"
            required
            id="classDays"
            className="sm:col-span-2"
            error={errors.classDays?.message ?? errors.classTime?.message ?? errors.classDurationMinutes?.message}
          >
            <SchedulePicker
              defaultDays={course?.classDays}
              defaultTime={course?.classTime}
              defaultDuration={course?.classDurationMinutes}
              onChange={({ days, time, duration }) => {
                const shouldValidate = form.formState.isSubmitted;
                setValue("classDays", days, { shouldValidate });
                setValue("classTime", time, { shouldValidate });
                setValue("classDurationMinutes", duration, { shouldValidate });
              }}
            />
          </Field>

          <Field label="Aula" id="classroom" error={errors.classroom?.message}>
            <Input id="classroom" type="text" placeholder="ej. Aula 3" {...register("classroom")} />
          </Field>

          <Controller
            name="maxCapacity"
            control={control}
            render={({ field }) => (
              <Field label="Cupo máximo" required id="maxCapacity" error={errors.maxCapacity?.message}>
                <input type="hidden" name="maxCapacity" value={field.value ?? 15} />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {CAPACITIES.map((n) => {
                    const active = field.value === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => field.onChange(n)}
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
            )}
          />

          <Field label="Docente" id="teacherId" error={errors.teacherId?.message}>
            <Select id="teacherId" {...register("teacherId")} defaultValue={course?.teacherId ?? ""}>
              <option value="">Sin asignar</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.fullName}</option>
              ))}
            </Select>
          </Field>

          {isEditing && (
            <Field label="Estado" id="status" error={(errors as Record<string, { message?: string }>).status?.message}>
              <Select id="status" {...register("status" as keyof CreateValues)} defaultValue={course?.status}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Autoevaluación diagnóstica (cada N clases)" id="diagnosticFrequency" className="sm:col-span-2" error={errors.diagnosticFrequency?.message}>
            <Select id="diagnosticFrequency" {...register("diagnosticFrequency")} defaultValue={String(course?.diagnosticFrequency ?? 0)}>
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
