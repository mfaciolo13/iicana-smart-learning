"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
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

interface UserEditFormProps {
  userId: string;
  fullName: string;
  phone: string | null;
  role: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function UserEditForm({ userId, fullName, phone, role, action }: UserEditFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const { fieldErrors, handleChange, formRef } = useFieldErrors(state);

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
  }, [state]);

  return (
    <Card title="Editar usuario" padding="md">
      <form ref={formRef} action={formAction} onChange={handleChange} className="space-y-4">
        <input type="hidden" name="id" value={userId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName" className="sm:col-span-2" error={fieldErrors.fullName}>
            <Input id="fullName" name="fullName" onInput={sanitizeNameInput} defaultValue={fullName} />
          </Field>

          <Field label="Teléfono" id="phone" error={fieldErrors.phone}>
            <Input id="phone" name="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} defaultValue={phone ?? ""} placeholder="Ej: 3516789012" />
          </Field>

          <Field label="Rol" required id="role" error={fieldErrors.role}>
            <Select id="role" name="role" defaultValue={role}>
              <option value="director">Director</option>
              <option value="administrativo">Administrativo</option>
              <option value="profesor">Docente</option>
              <option value="alumno">Alumno</option>
            </Select>
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}
