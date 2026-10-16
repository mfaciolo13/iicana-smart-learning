"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import type { z } from "zod";
import type { StudentListItem } from "@/modules/students/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { createPaymentSchema } from "../schemas";
import type { ActionResult } from "@/lib/action-result";
import { useFormAction } from "@/lib/use-form-action";
import { todayInstitute } from "@/lib/validation";
import type { Resolver } from "react-hook-form";

type FormValues = z.infer<typeof createPaymentSchema>;

interface PaymentFormProps {
  /** Destino del botón "Cancelar" (por defecto, portal director). */
  cancelHref?: string;
  students: StudentListItem[];
  defaultStudentId?: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

/**
 * Día 10 del mes corriente en hora del instituto; si ya pasó, el 10 del mes
 * siguiente (RN: las cuotas vencen el 10).
 *
 * SCRUM-361: se armaba con `setDate(10)` en hora local y se serializaba con
 * `toISOString()`, que es UTC. Después de las 21:00 ART eso corría la fecha al
 * día 11, y además el servidor (en UTC) y el navegador (en Córdoba) calculaban
 * valores distintos, provocando un mismatch de hidratación. Operando sobre el
 * string de `todayInstitute()` no hay conversión de zona en el medio.
 */
function defaultDueDate() {
  const [year, month, day] = todayInstitute().split("-").map(Number);
  if (day <= 10) return `${year}-${String(month).padStart(2, "0")}-10`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-10`;
}

export function PaymentForm({ students, defaultStudentId, action, cancelHref = "/director/payments" }: PaymentFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(createPaymentSchema) as Resolver<FormValues>,
    defaultValues: {
      studentId: defaultStudentId ?? "",
      amount: undefined,
      dueDate: defaultDueDate(),
      notes: "",
    },
  });
  const { register, formState: { errors } } = form;
  const { formRef, onSubmit, isPending } = useFormAction(form, action);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <Card title="Datos del pago" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Alumno" required id="studentId" className="sm:col-span-2" error={errors.studentId?.message}>
            <Select id="studentId" {...register("studentId")}>
              <option value="" disabled>Seleccioná un alumno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.dni}</option>
              ))}
            </Select>
          </Field>

          <Field label="Monto ($)" required id="amount" error={errors.amount?.message}>
            <Input id="amount" type="number" step={0.01} placeholder="ej. 15000" {...register("amount")} />
          </Field>

          <Field label="Fecha de vencimiento" required id="dueDate" error={errors.dueDate?.message}>
            <Input id="dueDate" type="date" {...register("dueDate")} />
          </Field>

          <Field label="Notas" id="notes" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea id="notes" maxLength={500} placeholder="Descripción opcional del pago..." {...register("notes")} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href={cancelHref} className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Registrar pago
        </Button>
      </div>
    </form>
  );
}
