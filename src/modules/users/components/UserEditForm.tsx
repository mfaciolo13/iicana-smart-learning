"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input, Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

interface UserEditFormProps {
  userId: string;
  fullName: string;
  phone: string | null;
  role: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function UserEditForm({ userId, fullName, phone, role, action }: UserEditFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <Card title="Editar usuario" padding="md">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={userId} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" required id="fullName" className="sm:col-span-2">
            <Input id="fullName" name="fullName" required defaultValue={fullName} />
          </Field>

          <Field label="Teléfono" id="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder="Ej: 3516789012" />
          </Field>

          <Field label="Rol" required id="role">
            <Select id="role" name="role" required defaultValue={role}>
              <option value="admin">Director</option>
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
