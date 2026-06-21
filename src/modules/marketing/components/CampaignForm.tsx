"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";
import { useFieldErrors } from "@/lib/use-field-errors";

interface Props {
  channels: { value: string; label: string }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function CampaignForm({ channels, action }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);
  const { fieldErrors, handleChange, formRef } = useFieldErrors(state);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) {
        router.push(state.redirectTo);
        router.refresh();
      }
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} onChange={handleChange} className="space-y-4">
      <Field label="Nombre de la campaña" required id="name" error={fieldErrors.name}>
        <Input id="name" name="name" placeholder="Ej: Campaña primavera 2025" />
      </Field>

      <Field label="Canal" required id="channel" error={fieldErrors.channel}>
        <Select id="channel" name="channel" defaultValue="">
          <option value="" disabled>Seleccioná un canal</option>
          {channels.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicio" required id="startDate" error={fieldErrors.startDate}>
          <Input id="startDate" type="date" name="startDate" defaultValue={today} />
        </Field>
        <Field label="Fin" id="endDate" error={fieldErrors.endDate}>
          <Input id="endDate" type="date" name="endDate" />
        </Field>
      </div>

      <Field label="Presupuesto" id="budget" error={fieldErrors.budget}>
        <Input id="budget" type="text" inputMode="decimal" name="budget" placeholder="0.00" />
      </Field>

      <Field label="Descripción" id="description" error={fieldErrors.description}>
        <Textarea id="description" name="description" rows={3} />
      </Field>

      <Button type="submit" variant="primary" loading={isPending} className="w-full justify-center">
        Registrar campaña
      </Button>
    </form>
  );
}
