import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { runRiskDetection, sendRiskReportToDirectors } from "@/modules/notifications/services/risk-detection.service";

// SCRUM-319: hasta 60 s por corrida (envíos de email en tanda).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRiskDetection();

  const { sent, failed } = await sendRiskReportToDirectors(result);

  console.log(`[cron/risk-detection] assessed=${result.assessed} atRisk=${result.atRisk} sent=${sent} failed=${failed}`);
  return NextResponse.json({ assessed: result.assessed, atRisk: result.atRisk, sent, failed });
}
