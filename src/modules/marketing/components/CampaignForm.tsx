"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";

interface Props {
  channels: { value: string; label: string }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function CampaignForm({ channels, action }: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) {
        router.push(state.redirectTo);
        router.refresh();
      }
    }
  }, [state, router]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nombre de la campaña" required id="name">
        <Input id="name" name="name" required placeholder="Ej: Campaña primavera 2025" />
      </Field>

      <Field label="Canal" required id="channel">
        <Select id="channel" name="channel" required defaultValue="">
          <option value="" disabled>Seleccioná un canal</option>
          {channels.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicio" required id="startDate">
          <Input id="startDate" type="date" name="startDate" required defaultValue={today} />
        </Field>
        <Field label="Fin" id="endDate">
          <Input id="endDate" type="date" name="endDate" />
        </Field>
      </div>

      <Field label="Presupuesto" id="budget">
        <Input id="budget" type="number" name="budget" min="0" step="0.01" placeholder="0.00" />
      </Field>

      <Field label="Descripción" id="description">
        <Textarea id="description" name="description" rows={3} />
      </Field>

      <Button type="submit" variant="primary" disabled={isPending} className="w-full justify-center">
        {isPending ? "Guardando..." : "Registrar campaña"}
      </Button>
    </form>
  );
}
