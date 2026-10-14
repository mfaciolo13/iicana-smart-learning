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
import type { Resolver } from "react-hook-form";

type FormValues = z.infer<typeof createPaymentSchema>;

interface PaymentFormProps {
  /** Destino del botón "Cancelar" (por defecto, portal director). */
  cancelHref?: string;
  students: StudentListItem[];
  defaultStudentId?: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

function defaultDueDate() {
  const d = new Date();
  d.setDate(10);
  if (d < new Date()) d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
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
