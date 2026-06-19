"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudentWithProfile } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";
import { NAME_DISALLOWED_CHARS } from "@/lib/validation";

function sanitizeNameInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const cleaned = el.value.replace(NAME_DISALLOWED_CHARS, "");
  if (cleaned !== el.value) el.value = cleaned;
}

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

interface StudentFormProps {
  student?: StudentWithProfile;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function StudentForm({ student, action, submitLabel = "Guardar" }: StudentFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const isEditing = !!student;

  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - 6, today.getMonth(), today.getDate())
    .toISOString()
    .split("T")[0];
  const minBirthDate = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate())
    .toISOString()
    .split("T")[0];

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={student.id} />}

      <Card title="Datos personales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName" error={state?.fieldErrors?.fullName}>
            <Input id="fullName" name="fullName" type="text" onInput={sanitizeNameInput} defaultValue={student?.profile.fullName} placeholder="Juan Pérez" />
          </Field>

          <Field label="DNI" required id="dni" error={state?.fieldErrors?.dni}>
            <Input id="dni" name="dni" type="text" inputMode="numeric" maxLength={8} defaultValue={student?.dni} placeholder="12345678" />
          </Field>

          {!isEditing && (
            <Field label="Email" required id="email" error={state?.fieldErrors?.email}>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="alumno@email.com" />
            </Field>
          )}

          <Field label="Teléfono" id="phone" error={state?.fieldErrors?.phone}>
            <Input id="phone" name="phone" type="tel" maxLength={20} defaultValue={student?.profile.phone ?? ""} placeholder="+54 9 351 000 0000" />
          </Field>

          <Field label="Fecha de nacimiento" required={!isEditing} id="birthDate" error={state?.fieldErrors?.birthDate}>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={student?.birthDate} min={minBirthDate} max={maxBirthDate} />
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

      <div className="flex justify-end gap-3">
        <Link href="/director/students" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
