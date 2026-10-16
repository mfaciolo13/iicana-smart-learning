"use server";

import { requireRole } from "@/lib/auth/helpers";
import { runRiskDetection } from "@/modules/notifications/services/risk-detection.service";
import { getDailyReportData } from "@/modules/notifications/services/daily-report.service";
import {
  getOverdueAlertRecipients,
  getPaymentReminderRecipients,
  getClassReminderRecipients,
} from "@/modules/notifications/services/cron.service";
import {
  sendDailyReportEmail,
  sendPaymentOverdueAlertEmail,
  sendPaymentReminderEmail,
  sendClassReminderEmail,
} from "@/lib/email";
import { db } from "@/lib/drizzle";
import { payments, students } from "@/lib/drizzle/schema";
import { markOverduePayments } from "@/modules/payments/services/payments.service";
import { eq, inArray } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";

export async function runRiskDetectionAction(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const { assessed, atRisk } = await runRiskDetection();
  return { success: `Evaluados: ${assessed} alumnos · En riesgo: ${atRisk}` };
}

export async function runDailyReportAction(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const data = await getDailyReportData();
  if (data.directorEmails.length === 0) return { error: "No hay directores con email configurado" };

  let sent = 0;
  let failed = 0;
  for (const email of data.directorEmails) {
    try {
      await sendDailyReportEmail({
        to: email,
        date: data.date,
        paymentsSummary: data.paymentsSummary,
        paymentsTotal: data.paymentsTotal,
        lowAttendanceStudents: data.lowAttendanceStudents,
        newStudents: data.newStudents,
      });
      sent++;
    } catch {
      failed++;
    }
  }
  return { success: `Reporte enviado · ${sent} destinatario${sent !== 1 ? "s" : ""}${failed ? ` · ${failed} fallido${failed !== 1 ? "s" : ""}` : ""}` };
}

export async function runOverdueAlertAction(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireRole(["director"]);

  // SCRUM-358: igual que el cron (SCRUM-284), antes de avisar hay que pasar a "Vencida"
  // toda cuota pendiente con vencimiento anterior a hoy. Sin este paso la acción manual
  // no veía la mora nueva: tanto los destinatarios como el conteo de restricción se
  // calculan sobre el estado almacenado, no sobre la fecha.
  const markedOverdue = await markOverduePayments();

  const recipients = await getOverdueAlertRecipients();

  let sent = 0;
  let failed = 0;
  let restricted = 0;

  for (const r of recipients) {
    try {
      await sendPaymentOverdueAlertEmail({
        to: r.email,
        fullName: r.fullName,
        courseName: r.courseName,
        dueDate: r.dueDate,
        amount: r.amount,
      });
      await db.update(payments).set({ overdueAlertSentAt: new Date() }).where(eq(payments.id, r.paymentId));
      sent++;
    } catch {
      failed++;
    }
  }

  // restrict students with 2+ overdue
  const studentRows = await db
    .select({ studentId: payments.studentId })
    .from(payments)
    // Una cuota suspendida cuenta como impaga junto con las vencidas (SCRUM-305).
    .where(inArray(payments.status, ["overdue", "suspended"]));

  const counts = new Map<string, number>();
  for (const r of studentRows) {
    counts.set(r.studentId, (counts.get(r.studentId) ?? 0) + 1);
  }

  for (const [studentId, count] of counts) {
    if (count >= 2) {
      const [current] = await db
        .select({ accessRestricted: students.accessRestricted })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);
      if (current && !current.accessRestricted) {
        await db.update(students).set({ accessRestricted: true, updatedAt: new Date() }).where(eq(students.id, studentId));
        restricted++;
      }
    }
  }

  const marcadas = markedOverdue ? `Cuotas marcadas vencidas: ${markedOverdue}` : "";

  if (sent === 0 && recipients.length === 0) {
    return {
      success: marcadas
        ? `${marcadas} · Sin alertas pendientes de envío`
        : "Sin pagos vencidos pendientes de alerta",
    };
  }
  return {
    success: `${marcadas ? `${marcadas} · ` : ""}Alertas enviadas: ${sent}${failed ? ` · Fallidos: ${failed}` : ""}${restricted ? ` · Accesos restringidos: ${restricted}` : ""}`,
  };
}

export async function runPaymentReminderAction(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const recipients = await getPaymentReminderRecipients();

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      await sendPaymentReminderEmail({
        to: r.email,
        fullName: r.fullName,
        courseName: r.courseName,
        dueDate: r.dueDate,
        amount: r.amount,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  if (recipients.length === 0) return { success: "Sin vencimientos próximos para recordar" };
  return { success: `Recordatorios enviados: ${sent}${failed ? ` · Fallidos: ${failed}` : ""}` };
}

export async function runClassReminderAction(_prev: ActionResult, _fd: FormData): Promise<ActionResult> {
  await requireRole(["director"]);
  const recipients = await getClassReminderRecipients();

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    try {
      await sendClassReminderEmail({
        to: r.email,
        fullName: r.fullName,
        courseName: r.courseName,
        classDate: r.classDate,
        classTime: r.classTime,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  if (recipients.length === 0) return { success: "Sin clases programadas para mañana" };
  return { success: `Recordatorios de clase enviados: ${sent}${failed ? ` · Fallidos: ${failed}` : ""}` };
}
