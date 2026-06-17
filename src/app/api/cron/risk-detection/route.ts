import { NextRequest, NextResponse } from "next/server";
import { runRiskDetection } from "@/modules/notifications/services/risk-detection.service";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runRiskDetection();

  console.log(`[cron/risk-detection] assessed=${result.assessed} atRisk=${result.atRisk}`);
  return NextResponse.json(result);
}
