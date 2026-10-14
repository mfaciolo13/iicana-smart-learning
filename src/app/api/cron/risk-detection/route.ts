import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { runRiskDetection } from "@/modules/notifications/services/risk-detection.service";

// SCRUM-319: hasta 60 s por corrida (envíos de email en tanda).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runRiskDetection();

  console.log(`[cron/risk-detection] assessed=${result.assessed} atRisk=${result.atRisk}`);
  return NextResponse.json(result);
}
