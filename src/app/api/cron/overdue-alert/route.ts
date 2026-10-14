import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { db } from "@/lib/drizzle";
import { payments, students } from "@/lib/drizzle/schema";
import { eq, count } from "drizzle-orm";
import { getOverdueAlertRecipients } from "@/modules/notifications/services/cron.service";
import { sendPaymentOverdueAlertEmail } from "@/lib/email";
import { markOverduePayments } from "@/modules/payments/services/payments.service";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // SCRUM-284: antes de avisar, pasar a "Vencida" toda cuota pendiente con vencimiento anterior a hoy
  // (las alertas, la restricción de acceso y el riesgo dependen del estado real en la base).
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
      await db
        .update(payments)
        .set({ overdueAlertSentAt: new Date() })
        .where(eq(payments.id, r.paymentId));
      sent++;
    } catch (err) {
      console.error(`[cron/overdue-alert] failed for ${r.email}:`, err);
      failed++;
    }
  }

  // Restrict students with 2+ overdue payments
  const studentRows = await db
    .select({ studentId: payments.studentId, overdueCount: count() })
    .from(payments)
    .where(eq(payments.status, "overdue"))
    .groupBy(payments.studentId);

  for (const row of studentRows) {
    if (row.overdueCount >= 2) {
      const [current] = await db
        .select({ accessRestricted: students.accessRestricted })
        .from(students)
        .where(eq(students.id, row.studentId))
        .limit(1);

      if (current && !current.accessRestricted) {
        await db
          .update(students)
          .set({ accessRestricted: true, updatedAt: new Date() })
          .where(eq(students.id, row.studentId));
        restricted++;
      }
    }
  }

  console.log(`[cron/overdue-alert] markedOverdue=${markedOverdue} sent=${sent} failed=${failed} restricted=${restricted} total=${recipients.length}`);
  return NextResponse.json({ markedOverdue, sent, failed, restricted, total: recipients.length });
}
