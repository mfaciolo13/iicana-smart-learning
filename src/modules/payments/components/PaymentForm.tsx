"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createPaymentSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import { todayInstitute } from "@/lib/validation";
import type { Resolver } from "react-hook-form";

type FormValues = z.infer<typeof createPaymentSchema>;

export interface PlanDefaults {
  courseId: string | null;
  listPrice: string;
  transferPrice: string | null;
  cashPrice: string | null;
}

interface PaymentFormProps {
  /** Destino del botón "Cancelar" (por defecto, portal director). */
  cancelHref?: string;
  students: { id: string; fullName: string; dni: string }[];
  courses: { id: string; name: string }[];
  /** Precios acordados por alumno: precargan la cuota al elegirlo. */
  plans: Record<string, PlanDefaults>;
  defaultStudentId?: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

/**
 * Día 10 del mes corriente en hora del instituto; si ya pasó, el 10 del mes
 * siguiente (RN: las cuotas vencen el 10).
 *
 * SCRUM-361: operando sobre el string de `todayInstitute()` no hay conversión de zona en el medio.
 */
function defaultDueDate() {
  const [year, month, day] = todayInstitute().split("-").map(Number);
  if (day <= 10) return `${year}-${String(month).padStart(2, "0")}-10`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-10`;
}

export function PaymentForm({ students, courses, plans, defaultStudentId, action, cancelHref = "/director/payments" }: PaymentFormProps) {
  const initialPlan = defaultStudentId ? plans[defaultStudentId] : undefined;
  const form = useForm<FormValues>({
    resolver: zodResolver(createPaymentSchema) as Resolver<FormValues>,
    defaultValues: {
      studentId: defaultStudentId ?? "",
      courseId: initialPlan?.courseId ?? undefined,
      amount: initialPlan ? Number(initialPlan.listPrice) : undefined,
      transferPrice: initialPlan?.transferPrice ? Number(initialPlan.transferPrice) : undefined,
      cashPrice: initialPlan?.cashPrice ? Number(initialPlan.cashPrice) : undefined,
      dueDate: defaultDueDate(),
      notes: "",
    },
  });
  const { register, setValue, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  // Al elegir un alumno con plan cargado, se precargan sus precios acordados.
  const studentField = register("studentId", {
    onChange: (e) => {
      const plan = plans[e.target.value];
      if (!plan) return;
      setValue("amount", Number(plan.listPrice));
      setValue("transferPrice", plan.transferPrice ? Number(plan.transferPrice) : undefined);
      setValue("cashPrice", plan.cashPrice ? Number(plan.cashPrice) : undefined);
      setValue("courseId", plan.courseId ?? undefined);
    },
  });

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <Card title="Datos de la cuota" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Alumno" required id="studentId" className="sm:col-span-2" error={errors.studentId?.message}>
            <Select id="studentId" {...studentField}>
              <option value="" disabled>Seleccioná un alumno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.dni}</option>
              ))}
            </Select>
          </Field>

          <Field label="Curso" id="courseId" className="sm:col-span-2" error={errors.courseId?.message}>
            <Select id="courseId" {...register("courseId")} defaultValue="">
              <option value="">Sin curso asociado</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>

          <Field label="Precio de lista ($)" required id="amount" error={errors.amount?.message}>
            <Input id="amount" type="number" step={0.01} placeholder="ej. 70000" {...register("amount")} />
          </Field>

          <Field label="Fecha de vencimiento" required id="dueDate" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </Field>

          <Field
            label="Precio por transferencia ($)"
            id="transferPrice"
            helper="Opcional. Si lo dejás vacío se aplica el descuento general por transferencia."
            error={errors.transferPrice?.message}
          >
            <Input id="transferPrice" type="number" step={0.01} placeholder="ej. 66500" {...register("transferPrice")} />
          </Field>

          <Field
            label="Precio en efectivo ($)"
            id="cashPrice"
            helper="Opcional. Si lo dejás vacío se aplica el descuento general por efectivo."
            error={errors.cashPrice?.message}
          >
            <Input id="cashPrice" type="number" step={0.01} placeholder="ej. 63000" {...register("cashPrice")} />
          </Field>

          <Field label="Notas" id="notes" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea id="notes" maxLength={500} placeholder="Descripción opcional de la cuota..." {...register("notes")} />
          </Field>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Los descuentos rigen hasta el día 10 de cada mes. La tarjeta lleva un recargo sobre el precio de lista. Los importes finales los calcula el servidor al cobrar.
        </p>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Registrar cuota
        </Button>
      </div>
    </form>
  );
}
