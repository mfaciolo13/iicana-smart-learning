import { sendToRole } from "@/modules/notifications/services/notifications.service";
import {
  getOverdueAlertTargets,
  getSuspensionTargets,
  markOverduePayments,
  markOverdueAlertSent,
  suspendStudentAndPayments,
  syncAccessRestriction,
} from "./payments.service";

export interface DelinquencyResult {
  /** Cuotas pasadas a "vencida". */
  markedOverdue: number;
  /** Avisos a Dirección por cuotas con más de 15 días de atraso. */
  alerts: number;
  /** Alumnos suspendidos por tener cuotas con más de 30 días de atraso. */
  suspended: number;
}

/**
 * Reglas de mora del instituto, en un solo lugar para que las ejecuten tanto el botón "Verificar alertas y
 * mora" como el proceso automático diario:
 *   - cuota sin pagar vencida → "vencida";
 *   - más de 15 días de atraso → aviso a Dirección (una sola vez por cuota);
 *   - más de 30 días de atraso → se suspende al alumno y a sus cuotas.
 * Antes toda esta lógica vivía únicamente detrás del botón y ninguno de los procesos automáticos la
 * invocaba: una cuota vencida hace 48 días nunca generaba aviso ni suspensión si nadie lo apretaba.
 */
export async function runDelinquencyChecks(): Promise<DelinquencyResult> {
  const markedOverdue = await markOverduePayments();

  const alertTargets = await getOverdueAlertTargets();
  for (const t of alertTargets) {
    await sendToRole("director", {
      type: "payment" as const,
      title: "Alerta de mora",
      body: `${t.studentName} tiene un pago vencido hace más de 15 días.`,
    });
  }
  if (alertTargets.length > 0) {
    await markOverdueAlertSent(alertTargets.map((t) => t.paymentId));
  }

  const suspensionTargets = await getSuspensionTargets();
  const byStudent = new Map<string, typeof suspensionTargets>();
  for (const t of suspensionTargets) {
    const list = byStudent.get(t.studentId) ?? [];
    list.push(t);
    byStudent.set(t.studentId, list);
  }
  let suspended = 0;
  for (const [studentId, items] of byStudent.entries()) {
    await suspendStudentAndPayments(studentId, items.map((i) => i.paymentId));
    await sendToRole("director", {
      type: "payment" as const,
      title: "Alumno suspendido por mora",
      body: `${items[0].studentName} fue suspendido por tener pagos vencidos hace más de 30 días.`,
    });
    // Suspender pasa las cuotas a "suspendida", que también cuentan como deuda para la restricción de acceso.
    await syncAccessRestriction(studentId);
    suspended++;
  }

  return { markedOverdue, alerts: alertTargets.length, suspended };
}
