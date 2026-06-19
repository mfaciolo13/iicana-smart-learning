"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudentListItem } from "@/modules/students/types";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Field, Select, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { ActionResult } from "@/lib/action-result";

interface PaymentFormProps {
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

export function PaymentForm({ students, defaultStudentId, action }: PaymentFormProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.error && !state?.fieldErrors) toast.error(state.error);
    if (state?.success) {
      toast.success(state.success);
      if (state.redirectTo) router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      <Card title="Datos del pago" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Alumno" required id="studentId" className="sm:col-span-2" error={state?.fieldErrors?.studentId}>
            <Select id="studentId" name="studentId" defaultValue={defaultStudentId ?? ""}>
              <option value="" disabled>Seleccioná un alumno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.dni}</option>
              ))}
            </Select>
          </Field>

          <Field label="Monto ($)" required id="amount" error={state?.fieldErrors?.amount}>
            <Input id="amount" name="amount" type="number" min={1} step={0.01} placeholder="ej. 15000" />
          </Field>

          <Field label="Fecha de vencimiento" required id="dueDate" error={state?.fieldErrors?.dueDate}>
            <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueDate()} />
          </Field>

          <Field label="Notas" id="notes" className="sm:col-span-2" error={state?.fieldErrors?.notes}>
            <Textarea id="notes" name="notes" maxLength={500} placeholder="Descripción opcional del pago..." />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/director/payments" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
        <Button type="submit" variant="primary" loading={isPending}>
          Registrar pago
        </Button>
      </div>
    </form>
  );
}
