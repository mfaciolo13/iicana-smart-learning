import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { MercadoPagoError, verifyWebhookSignature } from "@/lib/mercadopago";
import { handlePaymentNotification } from "@/modules/payments/services/mp.service";

export const maxDuration = 60;

/**
 * Notificaciones de Mercado Pago. Se valida la firma `x-signature` con el secreto del webhook; el
 * cuerpo NO se usa para decidir nada: se consulta el pago en la API oficial y recién ahí se actúa.
 * Responde 200 cuando la notificación quedó atendida (aunque sea repetida) y 5xx ante un fallo
 * transitorio, para que Mercado Pago reintente.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook sin configurar" }, { status: 503 });
  }

  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    // Mercado Pago a veces notifica sin cuerpo: alcanza con los parámetros de la URL.
  }

  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const type = url.searchParams.get("type") ?? body.type ?? null;

  const valid = verifyWebhookSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
    secret,
  });
  if (!valid) return NextResponse.json({ error: "Firma inválida" }, { status: 401 });

  // Solo interesan los pagos; el resto de los temas (merchant_order, etc.) se confirma y se ignora.
  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true, ignored: true });

  try {
    const result = await handlePaymentNotification(dataId);
    for (const base of ["/alumno", "/director", "/administrativo"]) revalidatePath(`${base}/payments`);
    return NextResponse.json({ ok: true, outcome: result.outcome });
  } catch (e) {
    // Un pago inexistente (p. ej. el de prueba del simulador) no se reintenta.
    if (e instanceof MercadoPagoError && e.status === 404) return NextResponse.json({ ok: true, ignored: true });
    console.error("[webhook mercadopago]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo procesar" }, { status: 500 });
  }
}
