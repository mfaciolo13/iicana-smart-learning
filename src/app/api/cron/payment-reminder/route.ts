import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getPaymentReminderRecipients } from "@/modules/notifications/services/cron.service";
import { sendPaymentReminderEmail } from "@/lib/email";
import { claimSend, releaseSend } from "@/lib/automation-sends";

// SCRUM-319: hasta 60 s por corrida (envíos de email en tanda).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = await getPaymentReminderRecipients();

  let sent = 0;
  let failed = 0;

  let skipped = 0;

  for (const r of recipients) {
    const key = `${r.paymentId}:${r.dueDate}`;
    if (!(await claimSend("payment_reminder", key))) {
      skipped++;
      continue;
    }
    try {
      await sendPaymentReminderEmail({
        to: r.email,
        fullName: r.fullName,
        courseName: r.courseName,
        dueDate: r.dueDate,
        amount: r.amount,
      });
      sent++;
    } catch (err) {
      console.error(`[cron/payment-reminder] failed for ${r.email}:`, err);
      await releaseSend("payment_reminder", key);
      failed++;
    }
  }

  console.log(`[cron/payment-reminder] sent=${sent} failed=${failed} skipped=${skipped} total=${recipients.length}`);
  return NextResponse.json({ sent, failed, skipped, total: recipients.length });
}
