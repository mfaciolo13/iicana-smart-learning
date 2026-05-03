"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { StudentWithProfile } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

const LEVELS = [
  { value: "beginner", label: "Principiante", range: "0–20 pts" },
  { value: "elementary", label: "Elemental", range: "21–40 pts" },
  { value: "pre_intermediate", label: "Pre-intermedio", range: "41–55 pts" },
  { value: "intermediate", label: "Intermedio", range: "56–70 pts" },
  { value: "upper_intermediate", label: "Upper-intermedio", range: "71–85 pts" },
  { value: "advanced", label: "Avanzado", range: "86–100 pts" },
];

const STATUSES = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "suspended", label: "Suspendido" },
  { value: "graduated", label: "Egresado" },
];

interface TutorOption {
  id: string;
  fullName: string;
  relationship: string;
}

interface StudentFormProps {
  student?: StudentWithProfile;
  tutors?: TutorOption[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function StudentForm({ student, tutors = [], action, submitLabel = "Guardar" }: StudentFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isEditing = !!student;

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={student.id} />}

      <Card title="Datos personales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName">
            <Input id="fullName" name="fullName" type="text" required defaultValue={student?.profile.fullName} placeholder="Juan Pérez" />
          </Field>

          <Field label="DNI" required id="dni">
            <Input id="dni" name="dni" type="text" required minLength={7} maxLength={8} defaultValue={student?.dni} placeholder="12345678" />
          </Field>

          {!isEditing && (
            <Field label="Email" required id="email">
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="alumno@email.com" />
            </Field>
          )}

          <Field label="Teléfono" id="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={student?.profile.phone ?? ""} placeholder="+54 9 351 000 0000" />
          </Field>

          <Field label="Fecha de nacimiento" required={!isEditing} id="birthDate">
            <Input id="birthDate" name="birthDate" type="date" required={!isEditing} defaultValue={student?.birthDate} />
          </Field>
        </div>
      </Card>

      <Card title="Test de nivelación" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Puntaje del test"
            id="placementTestScore"
            helper="De 0 a 100. El nivel se asigna automáticamente como referencia."
          >
            <Input
              id="placementTestScore"
              name="placementTestScore"
              type="number"
              min={0}
              max={100}
              defaultValue={student?.placementTestScore ?? ""}
              placeholder="Ej: 65"
            />
          </Field>

          <Field label="Nivel asignado" id="level">
            <Select id="level" name="level" defaultValue={student?.level ?? ""}>
              <option value="">Sin asignar</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label} ({l.range})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center">
          {LEVELS.map((l) => (
            <div key={l.value} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5">
              <p className="text-xs font-semibold text-slate-700">{l.range}</p>
              <p className="text-xs text-slate-400 leading-tight">{l.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {isEditing && (
        <Card title="Estado" padding="md">
          <Field label="Estado del alumno" id="status">
            <Select id="status" name="status" defaultValue={student?.status}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
        </Card>
      )}

      <Card title="Tutor responsable" padding="md">
        <p className="text-xs text-slate-500 mb-3">
          Requerido para alumnos menores de edad. El tutor debe estar previamente registrado en el sistema.
        </p>
        <Field label="Tutor" id="tutorId">
          <Select id="tutorId" name="tutorId" defaultValue={student?.tutorId ?? ""}>
            <option value="">Sin tutor asignado</option>
            {tutors.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName} ({t.relationship})
              </option>
            ))}
          </Select>
        </Field>
        {tutors.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">
            No hay tutores registrados.{" "}
            <a href="/admin/users" className="underline hover:text-amber-700">
              Registrá uno en Usuarios
            </a>{" "}
            con el rol Tutor.
          </p>
        )}
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/admin/students" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
