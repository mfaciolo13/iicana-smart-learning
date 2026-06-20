"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
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

interface Props {
  campaignId: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function InquiryForm({ campaignId, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const { fieldErrors, handleChange } = useFieldErrors(state);
  const [formKey, setFormKey] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormKey((k) => k + 1);
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} onChange={handleChange} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" required id="inq-name" error={fieldErrors.name}>
          <Input id="inq-name" name="name" onInput={sanitizeNameInput} placeholder="Nombre completo" />
        </Field>
        <Field label="Fecha" required id="inq-date" error={fieldErrors.receivedAt}>
          <Input id="inq-date" type="date" name="receivedAt" defaultValue={today} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" id="inq-email" error={fieldErrors.email}>
          <Input id="inq-email" type="text" inputMode="email" name="email" placeholder="opcional" />
        </Field>
        <Field label="Teléfono" id="inq-phone" error={fieldErrors.phone}>
          <Input
            id="inq-phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            onInput={sanitizePhoneInput}
            maxLength={11}
            placeholder="Ej: 3516789012"
          />
        </Field>
      </div>

      <Field label="Notas" id="inq-notes" error={fieldErrors.notes}>
        <Input id="inq-notes" name="notes" placeholder="Observaciones..." />
      </Field>

      <Button type="submit" variant="secondary" size="sm" loading={isPending} className="w-full justify-center">
        + Agregar consulta
      </Button>
    </form>
  );
}
