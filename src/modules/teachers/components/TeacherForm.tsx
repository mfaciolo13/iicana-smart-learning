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
import { NAME_DISALLOWED_CHARS } from "@/lib/validation";

// Elimina en tiempo real los caracteres no permitidos en un nombre.
function sanitizeNameInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  const cleaned = el.value.replace(NAME_DISALLOWED_CHARS, "");
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
  const isEditing = !!teacher;

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={teacher.id} />}

      <Card title="Datos personales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName">
            <Input id="fullName" name="fullName" type="text" required onInput={sanitizeNameInput} defaultValue={teacher?.profile.fullName} placeholder="Juan Pérez" />
          </Field>

          <Field label="DNI" required id="dni">
            <Input id="dni" name="dni" type="text" required inputMode="numeric" pattern="\d{7,8}" title="Solo números, 7 u 8 dígitos" minLength={7} maxLength={8} defaultValue={teacher?.dni} placeholder="12345678" />
          </Field>

          {!isEditing && (
            <Field label="Email" required id="email">
              <Input id="email" name="email" type="email" required autoComplete="email" placeholder="docente@email.com" />
            </Field>
          )}

          <Field label="Teléfono" id="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={teacher?.profile.phone ?? ""} placeholder="+54 9 351 000 0000" />
          </Field>
        </div>
      </Card>

      <Card title="Datos profesionales" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Especialización" id="specialization">
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
