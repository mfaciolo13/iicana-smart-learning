import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { getDailyReportData } from "@/modules/notifications/services/daily-report.service";
import { sendDailyReportEmail } from "@/lib/email";

// SCRUM-319: hasta 60 s por corrida (envíos de email en tanda).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getDailyReportData();

  if (data.directorEmails.length === 0) {
    console.log("[cron/daily-report] no director emails found");
    return NextResponse.json({ sent: 0, skipped: "no directors" });
  }

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
    } catch (err) {
      console.error(`[cron/daily-report] failed for ${email}:`, err);
      failed++;
    }
  }

  console.log(`[cron/daily-report] sent=${sent} failed=${failed}`);
  return NextResponse.json({ sent, failed, date: data.date });
}
