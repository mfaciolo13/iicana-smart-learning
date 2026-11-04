import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getClassReminderRecipients } from "@/modules/notifications/services/cron.service";
import { sendClassReminderEmail } from "@/lib/email";
import { claimSend, releaseSend } from "@/lib/automation-sends";

// SCRUM-319: hasta 60 s por corrida (envíos de email en tanda).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = await getClassReminderRecipients();

  let sent = 0;
  let failed = 0;

  let skipped = 0;

  for (const r of recipients) {
    // Una segunda ejecución (cron + "Ejecutar ahora") no repite los avisos ya enviados.
    const key = `${r.email}|${r.courseName}|${r.classDate}`;
    if (!(await claimSend("class_reminder", key))) {
      skipped++;
      continue;
    }
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
      await releaseSend("class_reminder", key);
      failed++;
    }
  }

  console.log(`[cron/class-reminder] sent=${sent} failed=${failed} skipped=${skipped} total=${recipients.length}`);
  return NextResponse.json({ sent, failed, skipped, total: recipients.length });
}
