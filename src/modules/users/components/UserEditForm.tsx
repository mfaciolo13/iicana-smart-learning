"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import type { Resolver } from "react-hook-form";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { updateUserSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import { NAME_DISALLOWED_CHARS, PHONE_DISALLOWED_CHARS } from "@/lib/validation";

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

// Client schema: updateUserSchema without the id (passed as hidden input)
const clientSchema = updateUserSchema.omit({ id: true });
type FormValues = z.infer<typeof clientSchema>;

interface UserEditFormProps {
  userId: string;
  fullName: string;
  phone: string | null;
  role: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function UserEditForm({ userId, fullName, phone, role, action }: UserEditFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(clientSchema) as Resolver<FormValues>,
    defaultValues: {
      fullName,
      phone: phone ?? "",
      role: role as FormValues["role"],
    },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <Card title="Editar usuario" padding="md">
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="id" value={userId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName" className="sm:col-span-2" error={errors.fullName?.message}>
            <Input id="fullName" onInput={sanitizeNameInput} {...register("fullName")} />
          </Field>

          <Field label="Teléfono" id="phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" inputMode="numeric" onInput={sanitizePhoneInput} maxLength={11} placeholder="Ej: 3516789012" {...register("phone")} />
          </Field>

          <Field label="Rol" required id="role" error={errors.role?.message}>
            <Select id="role" {...register("role")}>
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
