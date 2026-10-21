"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import { todayInstitute } from "@/lib/validation";

const campaignClientSchema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  channel: z.enum(["social_media", "email", "flyers", "word_of_mouth", "website", "other"], { message: "Seleccioná un canal" }),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().optional(),
  budget: z.string().regex(/^\d+(\.\d{1,2})?$/, "Ingresá un número válido (ej: 5000.00)").optional().or(z.literal("")),
  description: z.string().optional(),
}).refine((v) => !v.endDate || v.endDate >= v.startDate, {
  message: "La fecha de fin no puede ser anterior a la de inicio",
  path: ["endDate"],
});
type FormValues = z.infer<typeof campaignClientSchema>;

interface Props {
  channels: { value: string; label: string }[];
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function CampaignForm({ channels, action }: Props) {
  // Hora del instituto, no UTC (SCRUM-355).
  const today = todayInstitute();
  const form = useForm<FormValues>({
    resolver: zodResolver(campaignClientSchema),
    defaultValues: { name: "", channel: undefined, startDate: today, endDate: "", budget: "", description: "" },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <Field label="Nombre de la campaña" required id="name" error={errors.name?.message}>
        <Input id="name" placeholder="Ej: Campaña primavera 2025" {...register("name")} />
      </Field>

      <Field label="Canal" required id="channel" error={errors.channel?.message}>
        <Select id="channel" {...register("channel")} defaultValue="">
          <option value="" disabled>Seleccioná un canal</option>
          {channels.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Inicio" required id="startDate" error={errors.startDate?.message}>
          <Input id="startDate" type="date" {...register("startDate")} />
        </Field>
        <Field label="Fin" id="endDate" error={errors.endDate?.message}>
          <Input id="endDate" type="date" {...register("endDate")} />
        </Field>
      </div>

      <Field label="Presupuesto" id="budget" error={errors.budget?.message}>
        <Input id="budget" type="text" inputMode="decimal" placeholder="0.00" {...register("budget")} />
      </Field>

      <Field label="Descripción" id="description" error={errors.description?.message}>
        <Textarea id="description" rows={3} {...register("description")} />
      </Field>

      <Button type="submit" variant="primary" loading={isPending} className="w-full justify-center">
        Registrar campaña
      </Button>
    </form>
  );
}
