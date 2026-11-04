import { and, eq } from "drizzle-orm";
import { db } from "@/lib/drizzle";
import { automationSends } from "@/lib/drizzle/schema";

/**
 * Reserva un envío automático: devuelve true la primera vez que se pide esa (tipo, clave) y false las
 * siguientes. Se reserva ANTES de enviar y se libera con `releaseSend` si el envío falla, así una
 * segunda ejecución del proceso (cron + "Ejecutar ahora") no repite los correos ya enviados, pero un
 * fallo sí puede reintentarse.
 */
export async function claimSend(kind: string, dedupeKey: string): Promise<boolean> {
  const rows = await db
    .insert(automationSends)
    .values({ kind, dedupeKey })
    .onConflictDoNothing()
    .returning({ key: automationSends.dedupeKey });
  return rows.length > 0;
}

export async function releaseSend(kind: string, dedupeKey: string): Promise<void> {
  await db.delete(automationSends).where(and(eq(automationSends.kind, kind), eq(automationSends.dedupeKey, dedupeKey)));
}
