import { fromCents } from "@/lib/money";
import { INSTITUTE_TZ } from "@/lib/format";
import type { MpPreferenceRequest } from "@/lib/mercadopago";
import type { PaymentMethodKey, PriceQuote } from "./pricing";

/** Tipos de medio que Mercado Pago NO debe ofrecer según lo que eligió el alumno. */
export function excludedPaymentTypes(method: Exclude<PaymentMethodKey, "cash">): { id: string }[] {
  // Transferencia: dinero en cuenta y transferencia bancaria. Tarjeta: sólo crédito.
  const all = ["credit_card", "debit_card", "prepaid_card", "ticket", "atm", "bank_transfer", "account_money"];
  const allowed = method === "card" ? ["credit_card"] : ["bank_transfer", "account_money"];
  return all.filter((t) => !allowed.includes(t)).map((id) => ({ id }));
}

/** Fecha/hora con la zona del instituto en formato ISO con offset (-03:00), como pide Mercado Pago. */
export function toInstituteIso(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INSTITUTE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  // Argentina no tiene horario de verano: el offset es fijo.
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.000-03:00`;
}

/** Último instante (23:59:59 hora del instituto) del día `isoDate`. */
export function endOfInstituteDay(isoDate: string): Date {
  return new Date(`${isoDate}T23:59:59.999-03:00`);
}

/**
 * Vencimiento de una operación. Si el importe incluye un descuento, la operación vence al
 * terminar el último día de descuento: así quien la inicia el día 10 no puede acreditarla después
 * con el precio con descuento. Sin descuento, el importe es el de lista o el de tarjeta y se
 * conserva 48 horas.
 */
export function operationExpiry(p: { now: Date; today: string; quote: PriceQuote; discountDeadline: string }): Date {
  const MAX = new Date(p.now.getTime() + 48 * 60 * 60 * 1000);
  if (p.quote.discountCents <= 0) return MAX;
  const deadline = endOfInstituteDay(p.discountDeadline);
  // Nunca antes de unos minutos: el pago necesita tiempo para completarse.
  const min = new Date(p.now.getTime() + 15 * 60 * 1000);
  const end = deadline < MAX ? deadline : MAX;
  return end < min ? min : end;
}

export interface PreferenceInput {
  internalReference: string;
  title: string;
  quote: PriceQuote;
  method: Exclude<PaymentMethodKey, "cash">;
  payer: { email: string; name: string };
  baseUrl: string;
  now: Date;
  expiresAt: Date;
  /** Si es false (desarrollo en localhost) no se informa notification_url: Mercado Pago no puede llamar a localhost. */
  includeNotificationUrl: boolean;
}

export function buildPreference(i: PreferenceInput): MpPreferenceRequest {
  const back = (state: string) => `${i.baseUrl}/alumno/payments?mp=${state}`;
  return {
    items: [
      {
        id: i.internalReference,
        title: i.title,
        quantity: 1,
        unit_price: Number(fromCents(i.quote.finalCents)),
        currency_id: "ARS",
      },
    ],
    external_reference: i.internalReference,
    payer: { email: i.payer.email, name: i.payer.name },
    back_urls: { success: back("success"), failure: back("failure"), pending: back("pending") },
    // auto_return exige back_urls públicas; en localhost no se envía.
    ...(i.baseUrl.startsWith("https://") && { auto_return: "approved" as const }),
    ...(i.includeNotificationUrl && { notification_url: `${i.baseUrl}/api/webhooks/mercadopago` }),
    expires: true,
    expiration_date_from: toInstituteIso(i.now),
    expiration_date_to: toInstituteIso(i.expiresAt),
    statement_descriptor: "SMARTLEARNING",
    // Sin "pendiente por revisión": el pago queda aprobado o rechazado, así la cuota no queda en el aire.
    binary_mode: i.method === "card",
    payment_methods: {
      excluded_payment_types: excludedPaymentTypes(i.method),
      // El recargo del 5% supone un pago en una cuota.
      ...(i.method === "card" && { installments: 1 }),
    },
  };
}
