"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

interface ComplaintStatusFormProps {
  complaintId: string;
  currentStatus: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function ComplaintStatusForm({ complaintId, currentStatus, action }: ComplaintStatusFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <Card title="Cambiar estado" padding="md">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={complaintId} />
        <select
          name="status"
          defaultValue={currentStatus}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="open">Abierto</option>
          <option value="in_progress">En proceso</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </select>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          fullWidth
          loading={isPending}
          className="justify-center"
        >
          Actualizar estado
        </Button>
      </form>
    </Card>
  );
}
