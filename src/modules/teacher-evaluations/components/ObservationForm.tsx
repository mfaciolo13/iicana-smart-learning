"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { z } from "zod";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input, Textarea } from "@/components/ui/Input";
import { observationSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import type { Resolver } from "react-hook-form";

type FormValues = z.infer<typeof observationSchema>;

interface Props {
  teachers: { id: string; fullName: string }[];
  courses: { id: string; name: string; teacherId: string | null }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function ObservationForm({ teachers, courses, action }: Props) {
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const form = useForm<FormValues>({
    resolver: zodResolver(observationSchema) as Resolver<FormValues>,
    defaultValues: { teacherId: "", courseId: "", observedAt: "", overallRating: undefined, observations: "", strengths: "", improvements: "" },
  });
  const { register, formState: { errors }, setValue } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  const filteredCourses = selectedTeacherId
    ? courses.filter((c) => c.teacherId === selectedTeacherId)
    : courses;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <Field label="Docente" required id="teacherId" error={errors.teacherId?.message}>
        <Select
          id="teacherId"
          {...register("teacherId")}
          onChange={(e) => {
            setValue("teacherId", e.target.value, { shouldValidate: true });
            setSelectedTeacherId(e.target.value);
            setValue("courseId", "", { shouldValidate: false });
          }}
          defaultValue=""
        >
          <option value="" disabled>Seleccioná un docente</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </Select>
      </Field>

      <Field label="Curso" required id="courseId" error={errors.courseId?.message}>
        <Select id="courseId" {...register("courseId")} defaultValue="">
          <option value="" disabled>Seleccioná un curso</option>
          {filteredCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Fecha de observación" required id="observedAt" error={errors.observedAt?.message}>
        <Input id="observedAt" type="date" {...register("observedAt")} />
      </Field>

      <div>
        <StarRating
          name="overallRating"
          label="Calificación general"
          onChange={(v) => setValue("overallRating", v, { shouldValidate: true })}
        />
        {errors.overallRating && (
          <p className="text-xs text-red-500 mt-1">{errors.overallRating.message}</p>
        )}
      </div>

      <Field label="Observaciones generales" required id="observations" error={errors.observations?.message}>
        <Textarea id="observations" rows={4} placeholder="Describí las observaciones de la clase..." {...register("observations")} />
      </Field>

      <Field label="Fortalezas observadas" id="strengths" error={errors.strengths?.message}>
        <Textarea id="strengths" rows={2} placeholder="Aspectos destacados del docente..." {...register("strengths")} />
      </Field>

      <Field label="Áreas de mejora" id="improvements" error={errors.improvements?.message}>
        <Textarea id="improvements" rows={2} placeholder="Sugerencias para mejorar..." {...register("improvements")} />
      </Field>

      <Button type="submit" variant="primary" loading={isPending} className="w-full justify-center">
        Registrar observación
      </Button>
    </form>
  );
}
