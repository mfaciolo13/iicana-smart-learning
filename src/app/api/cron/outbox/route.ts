import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { retryPendingEmails } from "@/lib/outbox";

export const maxDuration = 60;

/** Reintenta los correos del módulo de pagos que quedaron pendientes o fallidos (avisos de retiro, comprobantes, facturas). */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sent, failed } = await retryPendingEmails();
  return NextResponse.json({ sent, failed });
}
