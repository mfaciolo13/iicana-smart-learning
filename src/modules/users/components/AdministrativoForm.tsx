"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";
import { createAdministrativoSchema } from "../schemas";
import { useFormAction } from "@/lib/use-form-action";
import { NAME_DISALLOWED_CHARS, PHONE_DISALLOWED_CHARS } from "@/lib/validation";
import { createAdministrativoAction } from "../actions";

type FormValues = z.infer<typeof createAdministrativoSchema>;

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

export function AdministrativoForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(createAdministrativoSchema) as Resolver<FormValues>,
    defaultValues: { fullName: "", email: "", phone: "" },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, createAdministrativoAction);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-lg">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <Field label="Nombre completo" id="fullName" required error={errors.fullName?.message}>
          <Input id="fullName" onInput={sanitizeNameInput} placeholder="María González" {...register("fullName")} />
        </Field>

        <Field label="Email" id="email" required error={errors.email?.message}>
          <Input id="email" type="text" inputMode="email" autoComplete="email" placeholder="maria@cervantes.com" {...register("email")} />
        </Field>

        <Field label="Teléfono" id="phone" error={errors.phone?.message}>
          <Input id="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} placeholder="Ej: 3516789012" {...register("phone")} />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={isPending}>
            Crear administrativo
          </Button>
          <Link href="/director/users" className={buttonVariants({ variant: "secondary" })}>
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
