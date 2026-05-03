"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/action-result";

interface Props {
  teachers: { id: string; fullName: string }[];
  courses: { id: string; name: string; teacherId: string | null }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function ObservationForm({ teachers, courses, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const filteredCourses = selectedTeacherId
    ? courses.filter((c) => c.teacherId === selectedTeacherId)
    : courses;

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Docente</label>
        <select
          name="teacherId"
          required
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Seleccioná un docente</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.fullName}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Curso</label>
        <select
          name="courseId"
          required
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Seleccioná un curso</option>
          {filteredCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de observación</label>
        <input
          type="date"
          name="observedAt"
          required
          max={new Date().toISOString().split("T")[0]}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>

      <StarRating name="overallRating" label="Calificación general" />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones generales *</label>
        <textarea
          name="observations"
          rows={4}
          required
          placeholder="Describí las observaciones de la clase..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fortalezas observadas</label>
        <textarea
          name="strengths"
          rows={2}
          placeholder="Aspectos destacados del docente..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Áreas de mejora</label>
        <textarea
          name="improvements"
          rows={2}
          placeholder="Sugerencias para mejorar..."
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
        />
      </div>

      <Button type="submit" variant="primary" disabled={isPending} className="w-full justify-center">
        {isPending ? "Guardando..." : "Registrar observación"}
      </Button>
    </form>
  );
}
