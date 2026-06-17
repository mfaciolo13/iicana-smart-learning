import { NextRequest, NextResponse } from "next/server";
import { getDailyReportData } from "@/modules/notifications/services/daily-report.service";
import { sendDailyReportEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
