"use client";

import { useMemo, useState } from "react";
import { Field, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { formatCents } from "@/lib/money";
import { formatDateAR } from "@/lib/format";
import type { ActionResult } from "@/lib/action-result";
import { CollectForm, type QuotesByMethod } from "./CollectForm";

export interface FlowCuota {
  id: string;
  studentId: string;
  periodLabel: string;
  dueDate: string;
  courseName: string | null;
  status: string;
  listCents: number;
  quotes: QuotesByMethod;
}

interface CollectFlowProps {
  students: { id: string; fullName: string; dni: string }[];
  cuotas: FlowCuota[];
  defaultStudentId?: string;
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}

const STATUS_LABELS: Record<string, string> = { pending: "Pendiente", overdue: "Vencida", suspended: "Suspendida" };

/** Flujo de cobro: alumno → cuota → medio de pago → confirmación. Los importes ya vienen calculados por el servidor. */
export function CollectFlow({ students, cuotas, defaultStudentId, action }: CollectFlowProps) {
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [paymentId, setPaymentId] = useState("");

  const studentCuotas = useMemo(() => cuotas.filter((c) => c.studentId === studentId), [cuotas, studentId]);
  const cuota = studentCuotas.find((c) => c.id === paymentId);
  const student = students.find((s) => s.id === studentId);

  return (
    <div className="space-y-6">
      <Card title="¿A quién y qué cuota?" padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Alumno" required id="flow-student">
            <Select
              id="flow-student"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setPaymentId("");
              }}
            >
              <option value="" disabled>Seleccioná un alumno</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.fullName} — {s.dni}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Cuota"
            required
            id="flow-cuota"
            helper={studentId && studentCuotas.length === 0 ? "Este alumno no tiene cuotas pendientes." : undefined}
          >
            <Select id="flow-cuota" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} disabled={!studentId || studentCuotas.length === 0}>
              <option value="" disabled>Seleccioná una cuota</option>
              {studentCuotas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.periodLabel} · vence {formatDateAR(c.dueDate)} · {formatCents(c.listCents)} · {STATUS_LABELS[c.status] ?? c.status}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {cuota && student && (
        <CollectForm
          key={cuota.id}
          paymentId={cuota.id}
          studentName={student.fullName}
          periodLabel={cuota.periodLabel}
          quotes={cuota.quotes}
          action={action}
          title={`Cobrar ${cuota.periodLabel}${cuota.courseName ? ` · ${cuota.courseName}` : ""}`}
        />
      )}
    </div>
  );
}
