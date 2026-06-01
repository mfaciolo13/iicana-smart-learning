"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";

interface Course {
  id: string;
  name: string;
  level: string;
}

interface GenerateAssessmentFormProps {
  courses: Course[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  cancelHref?: string;
}

export function GenerateAssessmentForm({ courses, action, cancelHref = "/director/assessments" }: GenerateAssessmentFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5 mt-2">
      <Field label="Curso" required id="courseId">
        <Select id="courseId" name="courseId" required>
          <option value="">Seleccioná un curso...</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.level}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Semana" required id="weekLabel" helper="Ej: Semana 3 — Mayo 2026">
        <Input
          id="weekLabel"
          name="weekLabel"
          required
          placeholder="Semana 3 — Mayo 2026"
        />
      </Field>

      <Field label="Tema de la semana" required id="topic" helper="Describí el contenido dado: gramática, vocabulario, función comunicativa, etc.">
        <Textarea
          id="topic"
          name="topic"
          required
          rows={3}
          placeholder="Ej: Present Perfect — usos con 'already', 'yet' y 'just'. Vocabulario de viajes."
        />
      </Field>

      <div className="pt-1 flex flex-col sm:flex-row gap-3">
        <Button type="submit" variant="primary" loading={isPending} className="w-full sm:w-auto">
          ✨ Generar con IA
        </Button>
        <Link
          href={cancelHref}
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
