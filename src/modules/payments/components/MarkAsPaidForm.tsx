"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/Button";
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
  }, [state]);

  return (
    <Card title="Registrar pago" padding="md">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={paymentId} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="method" className="block text-sm font-medium text-slate-700 mb-1">
              Método de pago <span className="text-red-500">*</span>
            </label>
            <select
              id="method"
              name="method"
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Seleccioná el método</option>
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
              <option value="card">Tarjeta</option>
            </select>
          </div>
          <div>
            <label htmlFor="receiptNumber" className="block text-sm font-medium text-slate-700 mb-1">
              Nº Recibo (opcional)
            </label>
            <input
              id="receiptNumber"
              name="receiptNumber"
              type="text"
              placeholder="ej. REC-00123"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
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
  }, [state]);

  return (
    <Card title="Cambiar estado" padding="md">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={paymentId} />
        <select
          name="status"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          defaultValue={currentStatus}
        >
          <option value="pending">Pendiente</option>
          <option value="overdue">Vencido</option>
          <option value="suspended">Suspendido</option>
        </select>
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
