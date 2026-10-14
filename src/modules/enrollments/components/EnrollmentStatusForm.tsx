"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Select, Field } from "@/components/ui/Input";
import type { ActionResult } from "@/lib/action-result";

interface EnrollmentStatusFormProps {
  enrollmentId: string;
  currentStatus: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function EnrollmentStatusForm({ enrollmentId, currentStatus, action }: EnrollmentStatusFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input type="hidden" name="id" value={enrollmentId} />
      <Field label="Cambiar estado" id="status" className="flex-1 max-w-xs">
        <Select id="status" name="status" defaultValue={currentStatus}>
          <option value="active">Activo</option>
          <option value="completed">Completado</option>
          <option value="withdrawn">Dado de baja</option>
        </Select>
      </Field>
      <Button type="submit" variant="secondary" loading={isPending}>
        Actualizar
      </Button>
    </form>
  );
}
