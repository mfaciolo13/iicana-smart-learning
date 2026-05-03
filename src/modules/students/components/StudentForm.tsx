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
  { value: "suspended", label: "Suspendido" },
  { value: "graduated", label: "Egresado" },
];

interface StudentFormProps {
  student?: StudentWithProfile;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function StudentForm({ student, action, submitLabel = "Guardar" }: StudentFormProps) {
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

      <Card title="Datos académicos" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nivel" id="level">
            <Select id="level" name="level" defaultValue={student?.level ?? ""}>
              <option value="">Sin asignar</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </Field>

          {isEditing && (
            <Field label="Estado" id="status">
              <Select id="status" name="status" defaultValue={student?.status}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
          )}
        </div>
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
