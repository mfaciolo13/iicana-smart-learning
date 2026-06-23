"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { z } from "zod";
import type { StudentWithProfile } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createStudentSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import { NAME_DISALLOWED_CHARS, PHONE_DISALLOWED_CHARS } from "@/lib/validation";

function sanitizeNameInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const cleaned = el.value.replace(NAME_DISALLOWED_CHARS, "");
  if (cleaned !== el.value) el.value = cleaned;
}

function sanitizePhoneInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const cleaned = el.value.replace(PHONE_DISALLOWED_CHARS, "");
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

// Edit schema: same validations, all optional (email not included) + status
const editClientSchema = createStudentSchema.omit({ email: true }).partial().extend({
  status: z.enum(["active", "inactive", "suspended", "graduated"]).optional(),
});

type CreateValues = z.infer<typeof createStudentSchema>;
type EditValues = z.infer<typeof editClientSchema>;

interface StudentFormProps {
  student?: StudentWithProfile;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function StudentForm({ student, action, submitLabel = "Guardar" }: StudentFormProps) {
  const isEditing = !!student;

  const form = useForm<CreateValues | EditValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? editClientSchema : createStudentSchema) as any,
    defaultValues: {
      fullName: student?.profile.fullName ?? "",
      email: "",
      phone: student?.profile.phone ?? "",
      dni: student?.dni ?? "",
      birthDate: student?.birthDate ?? "",
      level: student?.level || undefined,
      placementTestScore: student?.placementTestScore ?? undefined,
      ...(isEditing && { status: student.status }),
    },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form as any,
    action,
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={student.id} />}

      <Card title="Datos personales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName" error={(errors as Record<string, { message?: string }>).fullName?.message}>
            <Input id="fullName" type="text" onInput={sanitizeNameInput} placeholder="Juan Pérez" {...register("fullName")} />
          </Field>

          <Field label="DNI" required id="dni" error={(errors as Record<string, { message?: string }>).dni?.message}>
            <Input id="dni" type="text" inputMode="numeric" maxLength={8} placeholder="12345678" {...register("dni")} />
          </Field>

          {!isEditing && (
            <Field label="Email" required id="email" error={(errors as Record<string, { message?: string }>).email?.message}>
              <Input id="email" type="text" inputMode="email" autoComplete="email" placeholder="alumno@email.com" {...register("email")} />
            </Field>
          )}

          <Field label="Teléfono" id="phone" error={(errors as Record<string, { message?: string }>).phone?.message}>
            <Input id="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} placeholder="Ej: 3516789012" {...register("phone")} />
          </Field>

          <Field label="Fecha de nacimiento" required={!isEditing} id="birthDate" error={(errors as Record<string, { message?: string }>).birthDate?.message}>
            <Input id="birthDate" type="date" {...register("birthDate")} />
          </Field>
        </div>
      </Card>

      <Card title="Test de nivelación" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Puntaje del test" id="placementTestScore" helper="De 0 a 100. El nivel se asigna automáticamente como referencia.">
            <Input id="placementTestScore" type="number" placeholder="Ej: 65" {...register("placementTestScore")} />
          </Field>

          <Field label="Nivel asignado" id="level">
            <Select id="level" {...register("level")} defaultValue={student?.level ?? ""}>
              <option value="">Sin asignar</option>
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label} ({l.range})</option>
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
            <Select id="status" {...register("status")} defaultValue={student.status}>
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
