"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input, Textarea } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";
import { useFieldErrors } from "@/lib/use-field-errors";

interface Props {
  teachers: { id: string; fullName: string }[];
  courses: { id: string; name: string; teacherId: string | null }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function ObservationForm({ teachers, courses, action }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const { fieldErrors, handleChange, formRef } = useFieldErrors(state);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  const filteredCourses = selectedTeacherId
    ? courses.filter((c) => c.teacherId === selectedTeacherId)
    : courses;

  return (
    <form ref={formRef} action={formAction} onChange={handleChange} className="space-y-5">
      <Field label="Docente" required id="teacherId" error={fieldErrors.teacherId}>
        <Select
          id="teacherId"
          name="teacherId"
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          defaultValue=""
        >
          <option value="" disabled>Seleccioná un docente</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </Select>
      </Field>

      <Field label="Curso" required id="courseId" error={fieldErrors.courseId}>
        <Select id="courseId" name="courseId" defaultValue="">
          <option value="" disabled>Seleccioná un curso</option>
          {filteredCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </Field>

      <Field label="Fecha de observación" required id="observedAt" error={fieldErrors.observedAt}>
        <Input id="observedAt" type="date" name="observedAt" />
      </Field>

      <StarRating name="overallRating" label="Calificación general" />
      {fieldErrors.overallRating && (
        <p className="text-xs text-red-500 -mt-3">{fieldErrors.overallRating}</p>
      )}

      <Field label="Observaciones generales" required id="observations" error={fieldErrors.observations}>
        <Textarea
          id="observations"
          name="observations"
          rows={4}
          placeholder="Describí las observaciones de la clase..."
        />
      </Field>

      <Field label="Fortalezas observadas" id="strengths" error={fieldErrors.strengths}>
        <Textarea
          id="strengths"
          name="strengths"
          rows={2}
          placeholder="Aspectos destacados del docente..."
        />
      </Field>

      <Field label="Áreas de mejora" id="improvements" error={fieldErrors.improvements}>
        <Textarea
          id="improvements"
          name="improvements"
          rows={2}
          placeholder="Sugerencias para mejorar..."
        />
      </Field>

      <Button type="submit" variant="primary" loading={isPending} className="w-full justify-center">
        Registrar observación
      </Button>
    </form>
  );
}
