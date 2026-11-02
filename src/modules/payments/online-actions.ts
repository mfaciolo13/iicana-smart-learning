"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/helpers";
import type { ActionResult } from "@/lib/action-result";
import { getCurrentStudentId } from "./services/payments.service";
import { reconcileStudentOperations, startCheckout } from "./services/mp.service";

const startSchema = z.object({
  paymentId: z.uuid("Cuota inválida"),
  method: z.enum(["transfer", "card"], { message: "Elegí transferencia o tarjeta" }),
});

/**
 * Inicia el pago online de una cuota PROPIA y devuelve la URL de Mercado Pago. La cuota se
 * verifica contra el alumno de la sesión y el importe lo calcula el servidor; nada de lo que
 * manda el navegador decide cuánto se cobra.
 */
export async function startOnlinePaymentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireRole(["alumno"]);
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Tu usuario no tiene un legajo de alumno asociado." };

  const parsed = startSchema.safeParse({ paymentId: formData.get("paymentId"), method: formData.get("method") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const result = await startCheckout({ ...parsed.data, studentId });
  if (!result.ok) return { error: result.message };

  revalidatePath("/alumno/payments");
  return { success: "Te llevamos a Mercado Pago…", redirectTo: result.url };
}

/** "Actualizar estado": consulta a Mercado Pago los pagos en curso del alumno y aplica el resultado oficial. */
export async function refreshOnlinePaymentsAction(_prev: ActionResult): Promise<ActionResult> {
  await requireRole(["alumno"]);
  const studentId = await getCurrentStudentId();
  if (!studentId) return { error: "Tu usuario no tiene un legajo de alumno asociado." };

  const touched = await reconcileStudentOperations(studentId);
  revalidatePath("/alumno/payments");
  return { success: touched > 0 ? "Estado actualizado" : "Todavía no hay novedades de Mercado Pago" };
}
