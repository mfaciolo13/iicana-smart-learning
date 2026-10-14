"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Select, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

interface MarkAsPaidFormProps {
  paymentId: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function MarkAsPaidForm({ paymentId, action }: MarkAsPaidFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <Card title="Registrar pago" padding="md">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={paymentId} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Método de pago" required id="method" error={state?.fieldErrors?.method}>
            <Select id="method" name="method" defaultValue="">
              <option value="" disabled>Seleccioná el método</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </Select>
          </Field>

          <Field label="Nº Recibo (opcional)" id="receiptNumber">
            <Input
              id="receiptNumber"
              name="receiptNumber"
              type="text"
              placeholder="ej. REC-00123"
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isPending}>
            Confirmar pago
          </Button>
        </div>
      </form>
    </Card>
  );
}

interface PaymentStatusFormProps {
  paymentId: string;
  currentStatus: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

export function PaymentStatusForm({ paymentId, currentStatus, action }: PaymentStatusFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <Card title="Cambiar estado" padding="md">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={paymentId} />
        <Select
          name="status"
          defaultValue={currentStatus}
        >
          <option value="pending">Pendiente</option>
          <option value="overdue">Vencido</option>
          <option value="suspended">Suspendido</option>
        </Select>
        <Button
          type="submit"
          variant="secondary"
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
