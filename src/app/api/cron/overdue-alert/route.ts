import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { db } from "@/lib/drizzle";
import { payments } from "@/lib/drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { getOverdueAlertRecipients } from "@/modules/notifications/services/cron.service";
import { sendPaymentOverdueAlertEmail } from "@/lib/email";
import { markOverduePayments, syncAccessRestriction } from "@/modules/payments/services/payments.service";

// SCRUM-319: hasta 60 s por corrida (envíos de email en tanda).
export const maxDuration = 60;

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
  let lifted = 0;

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

  // SCRUM-352: se recalcula sobre TODO alumno con alguna cuota impaga, no sólo sobre
  // los que llegan a 2. Así la misma pasada que restringe al que entró en mora levanta
  // la restricción del que ya regularizó, en vez de dejarlo bloqueado para siempre.
  const studentRows = await db
    .selectDistinct({ studentId: payments.studentId })
    .from(payments)
    .where(inArray(payments.status, ["pending", "overdue", "suspended"]));

  for (const row of studentRows) {
    const sync = await syncAccessRestriction(row.studentId);
    if (sync?.restricted) restricted++;
    if (sync?.lifted) lifted++;
  }

  console.log(`[cron/overdue-alert] markedOverdue=${markedOverdue} sent=${sent} failed=${failed} restricted=${restricted} lifted=${lifted} total=${recipients.length}`);
  return NextResponse.json({ markedOverdue, sent, failed, restricted, lifted, total: recipients.length });
}
