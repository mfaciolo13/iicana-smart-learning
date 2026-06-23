"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import type { Resolver } from "react-hook-form";
import { personNameField, phoneField, NAME_DISALLOWED_CHARS, PHONE_DISALLOWED_CHARS } from "@/lib/validation";

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

const inquiryClientSchema = z.object({
  name: personNameField("El nombre"),
  receivedAt: z.string().min(1, "Fecha requerida"),
  email: z.string().optional(),
  phone: phoneField(),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof inquiryClientSchema>;

interface Props {
  campaignId: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function InquiryForm({ campaignId, action }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [formKey, setFormKey] = useState(0);

  const form = useForm<FormValues>({
    resolver: zodResolver(inquiryClientSchema) as Resolver<FormValues>,
    defaultValues: { name: "", receivedAt: today, email: "", phone: "", notes: "" },
  });
  const { register, formState: { errors }, reset } = form;
  const { formRef, onSubmit: baseSubmit, isPending } = useFormAction(form, async (prev, fd) => {
    const result = await action(prev, fd);
    if (result?.success) {
      reset({ name: "", receivedAt: today, email: "", phone: "", notes: "" });
      setFormKey((k) => k + 1);
    }
    return result;
  });

  return (
    <form key={formKey} ref={formRef} onSubmit={baseSubmit} className="space-y-3">
      <input type="hidden" name="campaignId" value={campaignId} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Nombre" required id="inq-name" error={errors.name?.message}>
          <Input id="inq-name" onInput={sanitizeNameInput} placeholder="Nombre completo" {...register("name")} />
        </Field>
        <Field label="Fecha" required id="inq-date" error={errors.receivedAt?.message}>
          <Input id="inq-date" type="date" {...register("receivedAt")} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" id="inq-email" error={errors.email?.message}>
          <Input id="inq-email" type="text" inputMode="email" placeholder="opcional" {...register("email")} />
        </Field>
        <Field label="Teléfono" id="inq-phone" error={errors.phone?.message}>
          <Input id="inq-phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} placeholder="Ej: 3516789012" {...register("phone")} />
        </Field>
      </div>

      <Field label="Notas" id="inq-notes" error={errors.notes?.message}>
        <Input id="inq-notes" placeholder="Observaciones..." {...register("notes")} />
      </Field>

      <Button type="submit" variant="secondary" size="sm" loading={isPending} className="w-full justify-center">
        + Agregar consulta
      </Button>
    </form>
  );
}
