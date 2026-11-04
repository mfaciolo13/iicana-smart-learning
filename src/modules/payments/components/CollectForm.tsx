"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Banknote, CreditCard, Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { formatCents, fromCents } from "@/lib/money";
import type { ActionResult } from "@/lib/action-result";
import type { PaymentMethodKey, PriceQuote } from "../lib/pricing";
import { METHOD_LABELS } from "../lib/pricing";

export type QuotesByMethod = Record<PaymentMethodKey, PriceQuote>;

const METHOD_ICONS = { cash: Banknote, transfer: Landmark, card: CreditCard } as const;
const METHOD_ORDER: PaymentMethodKey[] = ["transfer", "cash", "card"];

/** Texto corto bajo el importe de cada medio, armado con el resultado del servidor. */
export function quoteNote(q: PriceQuote): string {
  if (q.kind === "card_surcharge") return `Precio de lista + ${q.surchargePct}% de recargo`;
  if (q.discountCents > 0) return `${q.discountPct}% de descuento sobre la lista`;
  return q.discountsActive ? "Sin descuento cargado" : "Precio de lista (descuentos vencidos)";
}

/** Desglose del importe elegido: lista, descuento o recargo, total. */
export function QuoteBreakdown({ quote }: { quote: PriceQuote }) {
  return (
    <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm space-y-1.5">
      <div className="flex justify-between">
        <dt className="text-slate-500">Precio de lista</dt>
        <dd className="text-slate-800 tabular-nums">{formatCents(quote.listCents)}</dd>
      </div>
      {quote.discountCents > 0 && (
        <div className="flex justify-between">
          <dt className="text-slate-500">Descuento ({quote.discountPct}%)</dt>
          <dd className="text-emerald-700 tabular-nums">− {formatCents(quote.discountCents)}</dd>
        </div>
      )}
      {quote.surchargeCents > 0 && (
        <div className="flex justify-between">
          <dt className="text-slate-500">Recargo ({quote.surchargePct}%)</dt>
          <dd className="text-amber-700 tabular-nums">+ {formatCents(quote.surchargeCents)}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
        <dt className="font-semibold text-slate-800">Total a cobrar</dt>
        <dd className="text-lg font-bold text-slate-900 tabular-nums">{formatCents(quote.finalCents)}</dd>
      </div>
    </dl>
  );
}

interface CollectFormProps {
  paymentId: string;
  studentName: string;
  periodLabel: string;
  quotes: QuotesByMethod;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  title?: string;
}

/**
 * Cobro manual de una cuota. Los importes los calcula el servidor al renderizar; acá solo se
 * muestran. Al enviar, el servidor vuelve a calcular y rechaza el cobro si el importe cambió.
 */
export function CollectForm({ paymentId, studentName, periodLabel, quotes, action, title = "Registrar cobro" }: CollectFormProps) {
  const [state, formAction, isPending] = useActionState(action, undefined);
  const [method, setMethod] = useState<PaymentMethodKey | "">("");
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  const quote = method ? quotes[method] : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-base font-semibold text-slate-900 mb-4">{title}</h3>
      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => setConfirming(false)}
        className="space-y-5"
      >
        <input type="hidden" name="id" value={paymentId} />
        <input type="hidden" name="expectedAmount" value={quote ? fromCents(quote.finalCents) : ""} />

        <fieldset>
          <legend className="text-sm font-medium text-slate-700 mb-2">Medio de pago</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {METHOD_ORDER.map((m) => {
              const Icon = METHOD_ICONS[m];
              const q = quotes[m];
              const selected = method === m;
              return (
                <label
                  key={m}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 transition-colors",
                    selected ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 hover:border-slate-300",
                  )}
                >
                  <input type="radio" name="method" value={m} checked={selected} onChange={() => setMethod(m)} className="sr-only" />
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Icon className="w-4 h-4" strokeWidth={1.75} /> {METHOD_LABELS[m]}
                  </span>
                  <span className="block text-xl font-bold text-slate-900 mt-1 tabular-nums">{formatCents(q.finalCents)}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{quoteNote(q)}</span>
                </label>
              );
            })}
          </div>
          {state?.fieldErrors?.method && <p className="text-xs text-red-600 mt-1">{state.fieldErrors.method}</p>}
        </fieldset>

        {quote && <QuoteBreakdown quote={quote} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="N.º de recibo (opcional)" id="receiptNumber" error={state?.fieldErrors?.receiptNumber}>
            <Input id="receiptNumber" name="receiptNumber" type="text" maxLength={40} placeholder="ej. C220" />
          </Field>
          <Field label="Referencia externa (opcional)" id="externalReference" error={state?.fieldErrors?.externalReference}>
            <Input id="externalReference" name="externalReference" type="text" maxLength={100} placeholder="N.º de operación de la transferencia" />
          </Field>
          <Field label="Observaciones (opcional)" id="observations" className="sm:col-span-2" error={state?.fieldErrors?.observations}>
            <Textarea id="observations" name="observations" maxLength={500} placeholder="Algo que quieras dejar asentado" />
          </Field>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="primary" loading={isPending} disabled={!quote} onClick={() => setConfirming(true)}>
            Revisar y cobrar
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirming && !!quote}
        onClose={() => setConfirming(false)}
        onConfirm={() => formRef.current?.requestSubmit()}
        variant="primary"
        title="Confirmar cobro"
        confirmLabel="Confirmar cobro"
        message={
          quote
            ? `${studentName} · ${periodLabel} · ${METHOD_LABELS[quote.method]} · Total ${formatCents(quote.finalCents)}.${
                quote.method === "cash" ? " El importe ingresará a la caja de efectivo." : ""
              }`
            : ""
        }
      />
    </div>
  );
}
