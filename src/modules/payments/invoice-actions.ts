"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentActor } from "@/lib/audit";
import type { ActionResult } from "@/lib/action-result";
import { issueInvoice } from "./services/invoice.service";

/**
 * Emite o reintenta la Factura C de un pago confirmado. No duplica: si ya está emitida devuelve la
 * existente, y un reintento reutiliza el número reservado en el intento anterior.
 */
export async function issueInvoiceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["director", "administrativo"]);
  const actor = await getCurrentActor();
  if (!actor) return { error: "No autorizado" };

  const parsed = z.object({ paymentId: z.uuid("Pago inválido") }).safeParse({ paymentId: formData.get("paymentId") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await issueInvoice(parsed.data.paymentId, actor);
  for (const base of ["/director", "/administrativo", "/alumno"]) revalidatePath(`${base}/payments`);
  revalidatePath(`/director/payments/${parsed.data.paymentId}`);
  revalidatePath(`/administrativo/payments/${parsed.data.paymentId}`);

  if (result.status === "issued") return { success: "Factura emitida" };
  if (result.status === "skipped") return { error: result.message ?? "No se pudo emitir la factura" };
  return { error: `ARCA no emitió la factura: ${result.message ?? "error desconocido"}. Podés reintentar.` };
}
