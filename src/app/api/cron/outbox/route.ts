import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { retryPendingEmails } from "@/lib/outbox";
import { reconcileAllOperations } from "@/modules/payments/services/mp.service";

export const maxDuration = 60;

/**
 * Mantenimiento diario del módulo de pagos: reconcilia con Mercado Pago las operaciones que quedaron en curso
 * (por si una notificación no llegó), vence las que pasaron su plazo y reintenta los correos pendientes o fallidos.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const operations = await reconcileAllOperations();
  const { sent, failed } = await retryPendingEmails();
  return NextResponse.json({ sent, failed, ...operations });
}
