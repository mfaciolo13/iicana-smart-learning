import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyWebhookSignature } from "@/lib/mercadopago";
import { buildPreference, endOfInstituteDay, excludedPaymentTypes, operationExpiry, toInstituteIso } from "@/modules/payments/lib/mp-preference";
import { quotePayment } from "@/modules/payments/lib/pricing";

const SECRET = "clave-secreta-de-prueba";

function sign(dataId: string, requestId: string, ts: string, secret = SECRET) {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${createHmac("sha256", secret).update(manifest).digest("hex")}`;
}

describe("firma de las notificaciones de Mercado Pago", () => {
  it("acepta una firma válida", () => {
    const xSignature = sign("123456", "req-1", "1730000000");
    expect(verifyWebhookSignature({ xSignature, xRequestId: "req-1", dataId: "123456", secret: SECRET })).toBe(true);
  });

  it("normaliza el id a minúsculas, como lo firma Mercado Pago", () => {
    const xSignature = sign("ABC123", "req-1", "1730000000");
    expect(verifyWebhookSignature({ xSignature, xRequestId: "req-1", dataId: "ABC123", secret: SECRET })).toBe(true);
  });

  it("rechaza una firma con otro secreto, otro id o otro request-id", () => {
    const xSignature = sign("123456", "req-1", "1730000000", "otro-secreto");
    expect(verifyWebhookSignature({ xSignature, xRequestId: "req-1", dataId: "123456", secret: SECRET })).toBe(false);
    const ok = sign("123456", "req-1", "1730000000");
    expect(verifyWebhookSignature({ xSignature: ok, xRequestId: "req-1", dataId: "999999", secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: ok, xRequestId: "req-2", dataId: "123456", secret: SECRET })).toBe(false);
  });

  it("rechaza cabeceras ausentes o mal formadas y secreto vacío", () => {
    expect(verifyWebhookSignature({ xSignature: null, xRequestId: "r", dataId: "1", secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: "basura", xRequestId: "r", dataId: "1", secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: "ts=1", xRequestId: "r", dataId: "1", secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: sign("1", "r", "1"), xRequestId: "r", dataId: null, secret: SECRET })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: sign("1", "r", "1", ""), xRequestId: "r", dataId: "1", secret: "" })).toBe(false);
    expect(verifyWebhookSignature({ xSignature: sign("1", "r", "1"), xRequestId: "r", dataId: "1", secret: undefined })).toBe(false);
  });
});

describe("preferencia de pago", () => {
  const prices = { listPrice: "70000", transferPrice: "66500", cashPrice: "63000", discountValidUntil: "2026-11-10" };
  const now = new Date("2026-11-05T15:00:00Z");

  it("transferencia: sólo dinero en cuenta / transferencia, importe con descuento", () => {
    const quote = quotePayment(prices, "transfer", "2026-11-05");
    const pref = buildPreference({
      internalReference: "SL-20261105-AAAA",
      title: "Cuota",
      quote,
      method: "transfer",
      payer: { email: "a@b.com", name: "Ana" },
      baseUrl: "https://app.test",
      now,
      expiresAt: endOfInstituteDay("2026-11-10"),
      includeNotificationUrl: true,
    });
    expect(pref.items[0].unit_price).toBe(66500);
    expect(pref.external_reference).toBe("SL-20261105-AAAA");
    expect(pref.notification_url).toBe("https://app.test/api/webhooks/mercadopago");
    expect(pref.auto_return).toBe("approved");
    const excluded = pref.payment_methods.excluded_payment_types.map((t) => t.id);
    expect(excluded).toContain("credit_card");
    expect(excluded).not.toContain("bank_transfer");
    expect(excluded).not.toContain("account_money");
    expect(pref.payment_methods.installments).toBeUndefined();
  });

  it("tarjeta: sólo crédito, una cuota, importe con el 5% de recargo", () => {
    const quote = quotePayment(prices, "card", "2026-11-05");
    const pref = buildPreference({
      internalReference: "SL-X",
      title: "Cuota",
      quote,
      method: "card",
      payer: { email: "a@b.com", name: "Ana" },
      baseUrl: "https://app.test",
      now,
      expiresAt: new Date(now.getTime() + 3_600_000),
      includeNotificationUrl: true,
    });
    expect(pref.items[0].unit_price).toBe(73500);
    expect(pref.payment_methods.installments).toBe(1);
    const excluded = pref.payment_methods.excluded_payment_types.map((t) => t.id);
    expect(excluded).not.toContain("credit_card");
    expect(excluded).toContain("debit_card");
    expect(excluded).toContain("ticket");
  });

  it("en localhost no informa notification_url ni auto_return", () => {
    const pref = buildPreference({
      internalReference: "SL-X",
      title: "Cuota",
      quote: quotePayment(prices, "transfer", "2026-11-05"),
      method: "transfer",
      payer: { email: "a@b.com", name: "Ana" },
      baseUrl: "http://localhost:3000",
      now,
      expiresAt: new Date(now.getTime() + 3_600_000),
      includeNotificationUrl: false,
    });
    expect(pref.notification_url).toBeUndefined();
    expect(pref.auto_return).toBeUndefined();
  });

  it("transferencia y tarjeta no se ofrecen mutuamente", () => {
    const t = excludedPaymentTypes("transfer").map((x) => x.id);
    const c = excludedPaymentTypes("card").map((x) => x.id);
    expect(t).toContain("credit_card");
    expect(c).toContain("bank_transfer");
  });

  it("serializa fechas con el offset del instituto", () => {
    expect(toInstituteIso(new Date("2026-11-10T02:59:59Z"))).toBe("2026-11-09T23:59:59.000-03:00");
    expect(endOfInstituteDay("2026-11-10").toISOString()).toBe("2026-11-11T02:59:59.999Z");
  });
});

describe("vencimiento de la operación (política de descuentos)", () => {
  const prices = { listPrice: "70000", transferPrice: "66500", discountValidUntil: "2026-11-10" };

  it("una operación con descuento vence al terminar el último día de descuento", () => {
    const now = new Date("2026-11-09T15:00:00Z");
    const quote = quotePayment(prices, "transfer", "2026-11-09");
    const expiry = operationExpiry({ now, today: "2026-11-09", quote, discountDeadline: "2026-11-10" });
    expect(expiry.toISOString()).toBe("2026-11-11T02:59:59.999Z");
  });

  it("el precio congelado dura como máximo 48 horas aunque el descuento siga vigente", () => {
    const now = new Date("2026-11-02T15:00:00Z");
    const quote = quotePayment(prices, "transfer", "2026-11-02");
    const expiry = operationExpiry({ now, today: "2026-11-02", quote, discountDeadline: "2026-11-10" });
    expect(expiry.getTime() - now.getTime()).toBe(48 * 60 * 60 * 1000);
  });

  it("iniciada el día 10 no se extiende al 11", () => {
    const now = new Date("2026-11-10T20:00:00Z"); // 17:00 en Córdoba
    const quote = quotePayment(prices, "transfer", "2026-11-10");
    const expiry = operationExpiry({ now, today: "2026-11-10", quote, discountDeadline: "2026-11-10" });
    expect(expiry.getTime()).toBeLessThan(new Date("2026-11-11T03:00:00Z").getTime());
  });

  it("le deja al menos 15 minutos si se inicia al filo de la medianoche", () => {
    const now = new Date("2026-11-11T02:55:00Z"); // 23:55 del día 10
    const quote = quotePayment(prices, "transfer", "2026-11-10");
    const expiry = operationExpiry({ now, today: "2026-11-10", quote, discountDeadline: "2026-11-10" });
    expect(expiry.getTime() - now.getTime()).toBeGreaterThanOrEqual(15 * 60 * 1000);
  });

  it("sin descuento (lista o tarjeta) se conserva 48 horas", () => {
    const now = new Date("2026-11-15T15:00:00Z");
    const quote = quotePayment(prices, "card", "2026-11-15");
    const expiry = operationExpiry({ now, today: "2026-11-15", quote, discountDeadline: "2026-11-10" });
    expect(expiry.getTime() - now.getTime()).toBe(48 * 60 * 60 * 1000);
  });
});

describe("garantías de seguridad e idempotencia (código)", () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("el webhook valida la firma antes de hacer cualquier otra cosa y exige el secreto", () => {
    const src = read("src/app/api/webhooks/mercadopago/route.ts");
    expect(src.indexOf("verifyWebhookSignature")).toBeGreaterThan(-1);
    expect(src.indexOf("verifyWebhookSignature(")).toBeLessThan(src.indexOf("handlePaymentNotification("));
    expect(src).toContain("status: 503");
    expect(src).toContain("status: 401");
  });

  it("la confirmación consulta el pago en la API oficial, no usa el cuerpo de la notificación", () => {
    const src = read("src/modules/payments/services/mp.service.ts");
    expect(src).toContain("const mp = await getPayment(mpPaymentId)");
  });

  it("la URL de retorno nunca marca la cuota como pagada", () => {
    const src = read("src/modules/payments/components/StudentPayments.tsx");
    expect(src).toContain("reconcileStudentOperations");
    expect(src).not.toContain("collectPayment");
  });

  it("el alumno solo puede pagar cuotas propias y el importe no viene del navegador", () => {
    const actions = read("src/modules/payments/online-actions.ts");
    expect(actions).toContain("requireRole([\"alumno\"])");
    expect(actions).not.toMatch(/formData\.get\("(amount|finalAmount|price)"\)/);
    const service = read("src/modules/payments/services/mp.service.ts");
    expect(service).toContain("row.payment.studentId !== input.studentId");
  });

  it("la operación se cierra en la misma transacción que la cuota", () => {
    const src = read("src/modules/payments/services/mp.service.ts");
    expect(src).toContain("inTransaction:");
  });
});
