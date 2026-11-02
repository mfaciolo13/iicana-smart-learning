"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDateAR } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import { quarterLabel, quarterRange } from "../lib/increase";
import { cancelIncreaseAction, createIncreaseAction, updateIncreaseAction } from "../increase-actions";

interface QuarterOption {
  value: string;
  label: string;
}

/** Primer día del trimestre que todavía es futuro: sugerencia de fecha de vigencia. */
function suggestedDate(quarter: string, today: string): string {
  const { start, end } = quarterRange(quarter);
  if (start > today) return start;
  // Trimestre en curso: el mes siguiente que empieza dentro del trimestre, o el último día.
  const [y, m] = today.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return next <= end ? next : end;
}

interface FormProps {
  quarters: QuarterOption[];
  today: string;
  impact: { payments: number; plans: number };
}

/** Alta de un aumento trimestral. Pide confirmación antes de programarlo. */
export function CreateIncreaseForm({ quarters, today, impact }: FormProps) {
  const [state, formAction, isPending] = useActionState(createIncreaseAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const [quarter, setQuarter] = useState(quarters[0]?.value ?? "");
  const [date, setDate] = useState(quarters[0] ? suggestedDate(quarters[0].value, today) : "");
  const [percentage, setPercentage] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      formRef.current?.reset();
    }
  }, [state]);

  const range = quarter ? quarterRange(quarter) : null;

  return (
    <Card
      title="Programar un aumento"
      description="El porcentaje se aplica solo cuando llega la fecha de vigencia: no hace falta que nadie ingrese al sistema."
      padding="md"
    >
      <form ref={formRef} action={formAction} onSubmit={() => setConfirming(false)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Porcentaje de aumento (%)" required id="inc-percentage" error={state?.fieldErrors?.percentage}>
            <Input
              id="inc-percentage"
              name="percentage"
              type="number"
              step="0.01"
              min="0"
              max="1000"
              inputMode="decimal"
              placeholder="ej. 15"
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
          </Field>
          <Field label="Trimestre" required id="inc-quarter">
            <Select
              id="inc-quarter"
              name="quarter"
              value={quarter}
              onChange={(e) => {
                setQuarter(e.target.value);
                setDate(suggestedDate(e.target.value, today));
              }}
            >
              {quarters.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Entra en vigencia el" required id="inc-date" helper={range ? `Entre ${formatDateAR(range.start)} y ${formatDateAR(range.end)}` : undefined}>
            <Input id="inc-date" name="effectiveDate" type="date" value={date} min={today} max={range?.end} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Notas (opcional)" id="inc-notes">
          <Textarea id="inc-notes" name="notes" rows={2} maxLength={300} placeholder="ej. Aumento acordado en reunión de dirección" />
        </Field>
        <p className="text-xs text-slate-500">
          Al entrar en vigencia se actualizan {impact.payments} cuota{impact.payments === 1 ? "" : "s"} sin cobrar (con vencimiento desde esa fecha) y {impact.plans} plan
          {impact.plans === 1 ? "" : "es"} de alumno, según los datos de hoy. Los pagos ya confirmados no se tocan.
        </p>
        <div className="flex justify-end">
          <Button type="button" variant="primary" loading={isPending} disabled={percentage === ""} onClick={() => setConfirming(true)}>
            Programar aumento
          </Button>
        </div>
      </form>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        variant="primary"
        title="Confirmar aumento"
        confirmLabel="Programar"
        message={`Vas a programar un aumento de ${percentage || "0"}% para ${quarter ? quarterLabel(quarter) : ""}, con vigencia el ${formatDateAR(date)}. Hasta esa fecha podés modificarlo o cancelarlo.`}
      />
    </Card>
  );
}

function useToastState(state: ActionResult) {
  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);
}

interface RowFormProps extends FormProps {
  increase: { id: string; percentage: string; quarter: string; effectiveDate: string; notes: string | null };
}

/** Edición y cancelación de un aumento programado (mientras no entró en vigencia). */
export function ScheduledIncreaseActions({ increase, quarters, today }: RowFormProps) {
  const [updateState, updateAction, updating] = useActionState(updateIncreaseAction, undefined);
  const [cancelState, cancelAction, cancelling] = useActionState(cancelIncreaseAction, undefined);
  const [open, setOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelRef = useRef<HTMLFormElement>(null);
  const [quarter, setQuarter] = useState(increase.quarter);
  const range = quarterRange(quarter);
  useToastState(updateState);
  useToastState(cancelState);

  if (!open) {
    return (
      <div className="flex gap-3 text-sm">
        <button type="button" onClick={() => setOpen(true)} className="text-brand-700 hover:underline">
          Modificar
        </button>
        <form ref={cancelRef} action={cancelAction}>
          <input type="hidden" name="id" value={increase.id} />
          <button type="button" onClick={() => setConfirmCancel(true)} disabled={cancelling} className="text-red-600 hover:underline">
            Cancelar aumento
          </button>
        </form>
        <ConfirmDialog
          open={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            setConfirmCancel(false);
            cancelRef.current?.requestSubmit();
          }}
          title="Cancelar aumento"
          confirmLabel="Cancelar aumento"
          message={`¿Cancelar el aumento de ${Number(increase.percentage)}% de ${quarterLabel(increase.quarter)}? Quedará en el historial como cancelado.`}
        />
      </div>
    );
  }

  return (
    <form action={updateAction} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end rounded-lg border border-slate-200 p-3">
      <input type="hidden" name="id" value={increase.id} />
      <Field label="Porcentaje (%)" id={`p-${increase.id}`}>
        <Input id={`p-${increase.id}`} name="percentage" type="number" step="0.01" min="0" max="1000" defaultValue={Number(increase.percentage)} />
      </Field>
      <Field label="Trimestre" id={`q-${increase.id}`}>
        <Select id={`q-${increase.id}`} name="quarter" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          {quarters.map((q) => (
            <option key={q.value} value={q.value}>
              {q.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Vigencia" id={`d-${increase.id}`}>
        <Input id={`d-${increase.id}`} name="effectiveDate" type="date" defaultValue={increase.effectiveDate} min={today} max={range.end} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" loading={updating}>
          Guardar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>
      <input type="hidden" name="notes" value={increase.notes ?? ""} />
    </form>
  );
}
