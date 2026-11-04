"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ActionResult } from "@/lib/action-result";

type Action = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

/** Estado común: avisa por toast y limpia el formulario cuando la acción salió bien. */
function useCashAction(action: Action) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
    }
  }, [state]);

  return { state, formAction, isPending, formRef };
}

interface MovementFormProps {
  title: string;
  description?: string;
  action: Action;
  submitLabel: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  variant?: "primary" | "danger";
  /** Pide confirmación antes de guardar (retiros). */
  confirmMessage?: string;
}

/** Ingreso o retiro manual de efectivo: importe, motivo obligatorio y observación opcional. */
export function CashMovementForm({ title, description, action, submitLabel, reasonLabel, reasonPlaceholder, variant = "primary", confirmMessage }: MovementFormProps) {
  const { state, formAction, isPending, formRef } = useCashAction(action);
  const [confirming, setConfirming] = useState(false);
  const id = title.toLowerCase().replace(/\s+/g, "-");

  return (
    <Card title={title} description={description} padding="md">
      <form ref={formRef} action={formAction} onSubmit={() => setConfirming(false)} className="space-y-4">
        <Field label="Importe ($)" required id={`${id}-amount`} error={state?.fieldErrors?.amount}>
          <Input id={`${id}-amount`} name="amount" type="text" inputMode="decimal" placeholder="ej. 15000" autoComplete="off" />
        </Field>
        <Field label={reasonLabel} required id={`${id}-reason`} error={state?.fieldErrors?.reason}>
          <Input id={`${id}-reason`} name="reason" type="text" maxLength={200} placeholder={reasonPlaceholder} />
        </Field>
        <Field label="Observaciones (opcional)" id={`${id}-obs`} error={state?.fieldErrors?.observations}>
          <Textarea id={`${id}-obs`} name="observations" maxLength={500} rows={2} />
        </Field>
        <p className="text-xs text-slate-400">Fecha, hora y usuario responsable se registran automáticamente.</p>
        <div className="flex justify-end">
          {confirmMessage ? (
            <Button type="button" variant={variant} loading={isPending} onClick={() => setConfirming(true)}>
              {submitLabel}
            </Button>
          ) : (
            <Button type="submit" variant={variant} loading={isPending}>
              {submitLabel}
            </Button>
          )}
        </div>
      </form>
      {confirmMessage && (
        <ConfirmDialog
          open={confirming}
          onClose={() => setConfirming(false)}
          onConfirm={() => formRef.current?.requestSubmit()}
          variant={variant}
          title={submitLabel}
          confirmLabel="Confirmar"
          message={confirmMessage}
        />
      )}
    </Card>
  );
}

/** Saldo inicial de la caja (una sola vez, antes del primer movimiento). Sólo Dirección. */
export function OpeningBalanceForm({ action }: { action: Action }) {
  const { state, formAction, isPending, formRef } = useCashAction(action);
  return (
    <Card title="Saldo inicial" description="Se carga una sola vez, antes del primer movimiento." padding="md">
      <form ref={formRef} action={formAction} className="space-y-4">
        <Field label="Efectivo en caja hoy ($)" required id="opening-amount" error={state?.fieldErrors?.amount}>
          <Input id="opening-amount" name="amount" type="text" inputMode="decimal" placeholder="ej. 50000" autoComplete="off" />
        </Field>
        <Field label="Observaciones (opcional)" id="opening-obs" error={state?.fieldErrors?.observations}>
          <Input id="opening-obs" name="observations" type="text" maxLength={500} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isPending}>
            Cargar saldo inicial
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Conciliación: se cuenta el efectivo físico y se compara con el saldo del libro. */
export function ReconcileForm({ action }: { action: Action }) {
  const { state, formAction, isPending, formRef } = useCashAction(action);
  return (
    <Card title="Conciliar caja" description="Contá el efectivo que hay en la caja y compará con el saldo registrado." padding="md">
      <form ref={formRef} action={formAction} className="space-y-4">
        <Field label="Efectivo contado ($)" required id="counted" error={state?.fieldErrors?.counted}>
          <Input id="counted" name="counted" type="text" inputMode="decimal" placeholder="ej. 48500" autoComplete="off" />
        </Field>
        <Field label="Notas (opcional)" id="reconcile-notes" error={state?.fieldErrors?.notes}>
          <Input id="reconcile-notes" name="notes" type="text" maxLength={500} />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" loading={isPending}>
            Registrar conciliación
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Reversión autorizada de un movimiento manual (sólo Dirección): crea un asiento compensatorio. */
export function ReverseMovementButton({ movementId, action }: { movementId: string; action: Action }) {
  // Al revertir con éxito el movimiento queda marcado como revertido y este botón deja de mostrarse.
  const { formAction, isPending, formRef } = useCashAction(action);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-red-600 hover:underline">
        Revertir
      </button>
    );
  }
  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="movementId" value={movementId} />
      <Input name="reason" type="text" maxLength={200} placeholder="Motivo (mín. 10 caracteres)" aria-label="Motivo de la reversión" className="h-8 text-xs w-52" autoFocus />
      <Button type="submit" size="sm" variant="danger" loading={isPending}>
        Confirmar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancelar
      </Button>
    </form>
  );
}
