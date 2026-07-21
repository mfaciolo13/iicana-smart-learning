"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { updatePaymentAction, cancelPaymentAction } from "../actions";

interface PaymentEditFormProps {
  paymentId: string;
  amount: string;
  dueDate: string;
  notes: string | null;
}

/** Edición de un pago no cobrado — monto, vencimiento y observaciones. */
export function PaymentEditForm({ paymentId, amount, dueDate, notes }: PaymentEditFormProps) {
  const [state, formAction, isPending] = useActionState(updatePaymentAction, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <Card title="Editar pago" padding="md">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={paymentId} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Monto" required id="amount" error={state?.fieldErrors?.amount}>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              defaultValue={parseFloat(amount)}
            />
          </Field>

          <Field label="Vencimiento" required id="dueDate" error={state?.fieldErrors?.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={dueDate} />
          </Field>
        </div>

        <Field label="Observaciones" id="notes" error={state?.fieldErrors?.notes}>
          <Input id="notes" name="notes" type="text" defaultValue={notes ?? ""} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isPending}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}

/**
 * Anulación de un pago. Exige un motivo escrito: el registro se conserva para
 * auditoría, y sin motivo la anulación no sería explicable meses después.
 */
export function PaymentCancelForm({ paymentId }: { paymentId: string }) {
  const [state, formAction, isPending] = useActionState(cancelPaymentAction, undefined);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    // No hace falta cerrar el formulario al anular: el pago pasa a 'cancelled' y
    // la página deja de renderizar este componente tras el revalidatePath.
    if (state?.success) toast.success(state.success);
  }, [state]);

  if (!confirming) {
    return (
      <Card title="Anular pago" padding="md">
        <p className="text-xs text-slate-400 mb-3">
          El pago deja de contar para recaudación y mora, pero el registro se conserva para auditoría.
        </p>
        <Button variant="danger" size="sm" fullWidth className="justify-center" onClick={() => setConfirming(true)}>
          Anular pago
        </Button>
      </Card>
    );
  }

  return (
    <Card title="Anular pago" padding="md">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={paymentId} />
        <Field label="Motivo de la anulación" required id="reason">
          <Input
            id="reason"
            name="reason"
            type="text"
            placeholder="ej. cuota duplicada por error de carga"
            autoFocus
          />
        </Field>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="sm" fullWidth className="justify-center" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" size="sm" fullWidth className="justify-center" loading={isPending}>
            Confirmar anulación
          </Button>
        </div>
      </form>
    </Card>
  );
}
