"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import type { TeacherWithProfile } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createTeacherSchema } from "../schemas";
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

const editClientSchema = createTeacherSchema.omit({ email: true }).partial();

type CreateValues = z.infer<typeof createTeacherSchema>;
type EditValues = z.infer<typeof editClientSchema>;

interface TeacherFormProps {
  teacher?: TeacherWithProfile;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function TeacherForm({ teacher, action, submitLabel = "Guardar" }: TeacherFormProps) {
  const isEditing = !!teacher;

  const form = useForm<CreateValues | EditValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? editClientSchema : createTeacherSchema) as any,
    defaultValues: {
      fullName: teacher?.profile.fullName ?? "",
      email: "",
      phone: teacher?.profile.phone ?? "",
      dni: teacher?.dni ?? "",
      specialization: teacher?.specialization ?? "",
    },
  });
  const { register, formState: { errors } } = form;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { formRef, onSubmit, isPending } = useFormAction(form as any, action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={teacher.id} />}

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
              <Input id="email" type="text" inputMode="email" autoComplete="email" placeholder="docente@email.com" {...register("email")} />
            </Field>
          )}

          <Field label="Teléfono" id="phone" error={(errors as Record<string, { message?: string }>).phone?.message}>
            <Input id="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} placeholder="Ej: 3516789012" {...register("phone")} />
          </Field>
        </div>
      </Card>

      <Card title="Datos profesionales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Especialización" id="specialization" error={(errors as Record<string, { message?: string }>).specialization?.message}>
            <Input id="specialization" type="text" placeholder="ej. Cambridge CELTA, Phonics..." {...register("specialization")} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/director/teachers" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
