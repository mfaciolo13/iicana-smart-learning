"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TeacherWithProfile } from "../types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";
import { NAME_DISALLOWED_CHARS, PHONE_DISALLOWED_CHARS } from "@/lib/validation";
import { useFieldErrors } from "@/lib/use-field-errors";

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

interface TeacherFormProps {
  teacher?: TeacherWithProfile;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  submitLabel?: string;
}

export function TeacherForm({ teacher, action, submitLabel = "Guardar" }: TeacherFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const { fieldErrors, handleChange, formRef } = useFieldErrors(state);
  const isEditing = !!teacher;

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} onChange={handleChange} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={teacher.id} />}

      <Card title="Datos personales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName" error={fieldErrors.fullName}>
            <Input id="fullName" name="fullName" type="text" onInput={sanitizeNameInput} defaultValue={teacher?.profile.fullName} placeholder="Juan Pérez" />
          </Field>

          <Field label="DNI" required id="dni" error={fieldErrors.dni}>
            <Input id="dni" name="dni" type="text" inputMode="numeric" maxLength={8} defaultValue={teacher?.dni} placeholder="12345678" />
          </Field>

          {!isEditing && (
            <Field label="Email" required id="email" error={fieldErrors.email}>
              <Input id="email" name="email" type="text" inputMode="email" autoComplete="email" placeholder="docente@email.com" />
            </Field>
          )}

          <Field label="Teléfono" id="phone" error={fieldErrors.phone}>
            <Input id="phone" name="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} defaultValue={teacher?.profile.phone ?? ""} placeholder="Ej: 3516789012" />
          </Field>
        </div>
      </Card>

      <Card title="Datos profesionales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Especialización" id="specialization" error={fieldErrors.specialization}>
            <Input id="specialization" name="specialization" type="text" defaultValue={teacher?.specialization ?? ""} placeholder="ej. Cambridge CELTA, Phonics..." />
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
