import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { retryPendingEmails } from "@/lib/outbox";
import { retryFailedInvoices } from "@/modules/payments/services/invoice.service";

export const maxDuration = 60;

/** Mantenimiento diario del módulo de pagos: reintenta las facturas pendientes o fallidas y los correos que no salieron. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const invoices = await retryFailedInvoices();
  const { sent, failed } = await retryPendingEmails();
  return NextResponse.json({ sent, failed, invoices });
}
