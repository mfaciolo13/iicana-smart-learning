import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { payments, students } from "@/lib/drizzle/schema";
import { eq, and, count } from "drizzle-orm";
import { getOverdueAlertRecipients } from "@/modules/notifications/services/cron.service";
import { sendPaymentOverdueAlertEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

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

  console.log(`[cron/overdue-alert] sent=${sent} failed=${failed} restricted=${restricted} total=${recipients.length}`);
  return NextResponse.json({ sent, failed, restricted, total: recipients.length });
}
