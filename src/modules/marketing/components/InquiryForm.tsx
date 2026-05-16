"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";

interface Props {
  campaignId: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function InquiryForm({ campaignId, action }: Props) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormKey((k) => k + 1);
    }
  }, [state]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <form key={formKey} action={formAction} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" required id="inq-name">
          <Input id="inq-name" name="name" required placeholder="Nombre completo" />
        </Field>
        <Field label="Fecha" required id="inq-date">
          <Input id="inq-date" type="date" name="receivedAt" required defaultValue={today} max={today} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" id="inq-email">
          <Input id="inq-email" type="email" name="email" placeholder="opcional" />
        </Field>
        <Field label="Teléfono" id="inq-phone">
          <Input id="inq-phone" name="phone" placeholder="opcional" />
        </Field>
      </div>

      <Field label="Notas" id="inq-notes">
        <Input id="inq-notes" name="notes" placeholder="Observaciones..." />
      </Field>

      <Button type="submit" variant="secondary" size="sm" disabled={isPending} className="w-full justify-center">
        {isPending ? "Registrando..." : "+ Agregar consulta"}
      </Button>
    </form>
  );
}
