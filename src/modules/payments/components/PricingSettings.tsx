"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { PricingRates } from "../lib/pricing";
import { savePricingRatesAction, saveFeePlanAction } from "../settings-actions";
import type { FeePlanRow } from "../services/fee-plans.service";

/** Política económica general: descuentos por defecto, recargo de tarjeta y último día de descuento. */
export function RatesForm({ rates }: { rates: PricingRates }) {
  const [state, formAction, isPending] = useActionState(savePricingRatesAction, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  return (
    <Card
      title="Política de precios"
      description="Se usa cuando una cuota no trae precios propios. Todos los cálculos los hace el servidor."
      padding="md"
    >
      <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Descuento por transferencia (%)" required id="transferDiscountPct">
          <Input id="transferDiscountPct" name="transferDiscountPct" type="number" step="0.01" min="0" max="100" defaultValue={rates.transferDiscountPct} />
        </Field>
        <Field label="Descuento por efectivo (%)" required id="cashDiscountPct">
          <Input id="cashDiscountPct" name="cashDiscountPct" type="number" step="0.01" min="0" max="100" defaultValue={rates.cashDiscountPct} />
        </Field>
        <Field label="Recargo de tarjeta (%)" required id="cardSurchargePct" helper="Se aplica sobre el precio de lista, nunca sobre uno con descuento.">
          <Input id="cardSurchargePct" name="cardSurchargePct" type="number" step="0.01" min="0" max="100" defaultValue={rates.cardSurchargePct} />
        </Field>
        <Field label="Los descuentos rigen hasta el día" required id="discountLastDay" helper="Inclusive. Del día siguiente hasta fin de mes se cobra el precio de lista.">
          <Input id="discountLastDay" name="discountLastDay" type="number" step="1" min="1" max="28" defaultValue={rates.discountLastDay} />
        </Field>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" variant="primary" loading={isPending}>
            Guardar política
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PlanRow({ plan, courses, editable }: { plan: FeePlanRow; courses: { id: string; name: string }[]; editable: boolean }) {
  const [state, formAction, isPending] = useActionState(saveFeePlanAction, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) toast.success(state.success);
  }, [state]);

  const price = (v: string | null) => (v ? Number(v) : "");

  if (!editable) {
    const fmt = (v: string | null) => (v ? `$ ${Number(v).toLocaleString("es-AR")}` : "—");
    return (
      <tr>
        <td className="py-2.5 pr-4">
          <p className="font-medium text-slate-900">{plan.studentName}</p>
          <p className="text-xs text-slate-400 font-mono">{plan.studentDni}</p>
        </td>
        <td className="py-2.5 pr-4 text-slate-600">{plan.courseName ?? "—"}</td>
        <td className="py-2.5 pr-4 tabular-nums">{fmt(plan.listPrice)}</td>
        <td className="py-2.5 pr-4 tabular-nums">{fmt(plan.transferPrice)}</td>
        <td className="py-2.5 tabular-nums">{fmt(plan.cashPrice)}</td>
      </tr>
    );
  }

  return (
    <tr className="align-top">
      <td className="py-2.5 pr-3">
        <p className="font-medium text-slate-900">{plan.studentName}</p>
        <p className="text-xs text-slate-400 font-mono">{plan.studentDni}</p>
      </td>
      <td colSpan={4} className="py-2">
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="studentId" value={plan.studentId} />
          <select
            name="courseId"
            defaultValue={plan.courseId ?? ""}
            aria-label={`Curso de ${plan.studentName}`}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm w-44"
          >
            <option value="">Sin curso</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input name="listPrice" type="number" step="0.01" min="0" placeholder="Lista" aria-label={`Precio de lista de ${plan.studentName}`} defaultValue={price(plan.listPrice)} className="h-9 w-28" />
          <Input name="transferPrice" type="number" step="0.01" min="0" placeholder="Transfer." aria-label={`Precio por transferencia de ${plan.studentName}`} defaultValue={price(plan.transferPrice)} className="h-9 w-28" />
          <Input name="cashPrice" type="number" step="0.01" min="0" placeholder="Efectivo" aria-label={`Precio en efectivo de ${plan.studentName}`} defaultValue={price(plan.cashPrice)} className="h-9 w-28" />
          <Button type="submit" size="sm" variant="secondary" loading={isPending}>
            Guardar
          </Button>
        </form>
      </td>
    </tr>
  );
}

/** Precios acordados por alumno. Dirección edita; Administrativo sólo consulta. */
export function PlansTable({ plans, courses, editable }: { plans: FeePlanRow[]; courses: { id: string; name: string }[]; editable: boolean }) {
  if (plans.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">No hay alumnos para mostrar.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-brand-700 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="py-3 pr-4">Alumno</th>
            {editable ? (
              <th className="py-3" colSpan={4}>Curso · Lista · Transferencia · Efectivo</th>
            ) : (
              <>
                <th className="py-3 pr-4">Curso</th>
                <th className="py-3 pr-4">Lista</th>
                <th className="py-3 pr-4">Transferencia</th>
                <th className="py-3">Efectivo</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {plans.map((p) => (
            <PlanRow key={p.studentId} plan={p} courses={courses} editable={editable} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
