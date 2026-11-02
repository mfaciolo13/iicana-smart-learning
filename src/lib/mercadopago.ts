import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cliente mínimo de la API oficial de Mercado Pago (Checkout Pro). Las credenciales viven sólo en
 * variables de entorno del servidor: este módulo nunca se importa desde componentes de cliente.
 *
 *   MERCADOPAGO_ACCESS_TOKEN     token privado (TEST-... en sandbox, APP_USR-... en producción)
 *   MERCADOPAGO_WEBHOOK_SECRET   clave secreta de la firma de notificaciones (panel de la app > Webhooks)
 *   MERCADOPAGO_ENV              "sandbox" | "production" (por defecto sandbox)
 */

const API_BASE = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 15_000;

export function isMercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
}

export function mercadoPagoEnv(): "sandbox" | "production" {
  return process.env.MERCADOPAGO_ENV?.trim() === "production" ? "production" : "sandbox";
}

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

async function mpFetch<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new MercadoPagoError("Mercado Pago no está configurado");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.idempotencyKey && { "X-Idempotency-Key": init.idempotencyKey }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new MercadoPagoError("No se pudo conectar con Mercado Pago");
  }

  if (!res.ok) {
    // Se registra el código y no el cuerpo completo: puede traer datos del pagador.
    throw new MercadoPagoError(`Mercado Pago respondió ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export interface MpPreferenceRequest {
  items: { id: string; title: string; quantity: number; unit_price: number; currency_id: "ARS" }[];
  external_reference: string;
  payer?: { email?: string; name?: string };
  back_urls: { success: string; failure: string; pending: string };
  auto_return?: "approved";
  notification_url?: string;
  expires: boolean;
  expiration_date_from: string;
  expiration_date_to: string;
  statement_descriptor?: string;
  binary_mode?: boolean;
  payment_methods: {
    excluded_payment_types: { id: string }[];
    installments?: number;
  };
}

export interface MpPreference {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

export function createPreference(body: MpPreferenceRequest, idempotencyKey: string): Promise<MpPreference> {
  return mpFetch<MpPreference>("/checkout/preferences", { method: "POST", body, idempotencyKey });
}

export interface MpPayment {
  id: number;
  status: string; // approved | pending | in_process | authorized | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  transaction_amount: number;
  currency_id: string;
  external_reference?: string | null;
  date_approved?: string | null;
  date_last_updated?: string | null;
  payment_type_id?: string;
}

export function getPayment(id: string | number): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${encodeURIComponent(String(id))}`);
}

export async function searchPaymentsByReference(externalReference: string): Promise<MpPayment[]> {
  const q = new URLSearchParams({ external_reference: externalReference, sort: "date_created", criteria: "desc" });
  const res = await mpFetch<{ results?: MpPayment[] }>(`/v1/payments/search?${q.toString()}`);
  return res.results ?? [];
}

/**
 * Verifica la firma de una notificación (cabecera `x-signature`, formato `ts=...,v1=...`).
 * El mensaje firmado es `id:<data.id en minúsculas>;request-id:<x-request-id>;ts:<ts>;` con HMAC-SHA256
 * y la clave secreta del webhook. Comparación en tiempo constante.
 */
export function verifyWebhookSignature(p: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string | undefined;
}): boolean {
  if (!p.secret || !p.xSignature || !p.dataId) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of p.xSignature.split(",")) {
    const [key, ...rest] = part.split("=");
    const value = rest.join("=").trim();
    if (key.trim() === "ts") ts = value;
    if (key.trim() === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  const manifest = `id:${p.dataId.toLowerCase()};request-id:${p.xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", p.secret).update(manifest).digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
