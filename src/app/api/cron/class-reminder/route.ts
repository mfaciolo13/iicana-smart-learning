import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getClassReminderRecipients } from "@/modules/notifications/services/cron.service";
import { sendClassReminderEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    } catch (err) {
      console.error(`[cron/class-reminder] failed for ${r.email}:`, err);
      failed++;
    }
  }

  console.log(`[cron/class-reminder] sent=${sent} failed=${failed} total=${recipients.length}`);
  return NextResponse.json({ sent, failed, total: recipients.length });
}
