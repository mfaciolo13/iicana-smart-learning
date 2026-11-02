import { emailShell as emailLayout, esc } from "@/lib/email-layout";
import { INSTITUTE_TZ } from "@/lib/format";
import { formatCents, toCents } from "@/lib/money";
import { METHOD_LABELS, type PaymentMethodKey } from "./pricing";
import { periodLabel } from "./period-label";

/** URL pública para armar links dentro de correos (sin depender de headers de un request). */
export function publicBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function formatDateTimeAR(d: Date | string): string {
  return new Date(d).toLocaleString("es-AR", { timeZone: INSTITUTE_TZ, dateStyle: "short", timeStyle: "short" });
}

export { periodLabel };

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">${esc(label)}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;text-align:right;font-weight:600;">${value}</td></tr>`;

interface WithdrawalMovement {
  id: string;
  amount: string;
  reason: string;
  observations: string | null;
  balanceBefore: string;
  balanceAfter: string;
  occurredAt: Date;
  createdByName: string | null;
}

/** Aviso a Dirección de un retiro de caja. */
export function withdrawalNoticeEmail(m: WithdrawalMovement): string {
  return emailLayout(`
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Se registró un <strong>retiro de efectivo</strong> de la caja.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin:0 0 20px;">
      ${row("Importe retirado", esc(formatCents(toCents(m.amount))))}
      ${row("Motivo", esc(m.reason))}
      ${m.observations ? row("Observaciones", esc(m.observations)) : ""}
      ${row("Fecha y hora", esc(formatDateTimeAR(m.occurredAt)))}
      ${row("Responsable", esc(m.createdByName ?? "—"))}
      ${row("Saldo anterior", esc(formatCents(toCents(m.balanceBefore))))}
      ${row("Saldo posterior", esc(formatCents(toCents(m.balanceAfter))))}
      ${row("Identificador del movimiento", `<span style="font-family:monospace;">${esc(m.id)}</span>`)}
    </table>
    <p style="margin:0;color:#94a3b8;font-size:12px;">Podés consultar el movimiento en Pagos → Caja.</p>
  `);
}

export interface ReceiptEmailData {
  studentName: string;
  courseName: string | null;
  period: string | null;
  method: PaymentMethodKey;
  paidAt: Date;
  listPrice: string;
  discountAmount: string;
  surchargeAmount: string;
  finalAmount: string;
  receiptNumber: string;
  receiptUrl: string;
  /** Se completa cuando la factura ya fue emitida. */
  invoiceUrl?: string | null;
  invoiceNumber?: string | null;
}

/** Comprobante de pago para el alumno (con enlace seguro de descarga). */
export function receiptEmail(d: ReceiptEmailData): string {
  const discount = toCents(d.discountAmount);
  const surcharge = toCents(d.surchargeAmount);
  const firstName = d.studentName.split(" ")[0];
  return emailLayout(`
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Recibimos tu pago. Te dejamos el comprobante de la cuota de <strong>${esc(periodLabel(d.period))}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin:0 0 20px;">
      ${d.courseName ? row("Curso", esc(d.courseName)) : ""}
      ${row("Período", esc(periodLabel(d.period)))}
      ${row("Medio de pago", esc(METHOD_LABELS[d.method]))}
      ${row("Fecha de pago", esc(formatDateTimeAR(d.paidAt)))}
      ${row("Precio de lista", esc(formatCents(toCents(d.listPrice))))}
      ${discount > 0 ? row("Descuento", `− ${esc(formatCents(discount))}`) : ""}
      ${surcharge > 0 ? row("Recargo", `+ ${esc(formatCents(surcharge))}`) : ""}
      ${row("Importe abonado", esc(formatCents(toCents(d.finalAmount))))}
      ${row("N.º de comprobante", esc(d.receiptNumber))}
    </table>
    <p style="margin:0 0 12px;"><a href="${esc(d.receiptUrl)}" style="display:inline-block;background:#2d5383;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">Ver comprobante</a></p>
    ${
      d.invoiceUrl
        ? `<p style="margin:0 0 12px;"><a href="${esc(d.invoiceUrl)}" style="color:#2d5383;font-size:14px;font-weight:600;">Descargar Factura C ${esc(d.invoiceNumber ?? "")}</a></p>`
        : `<p style="margin:0 0 12px;color:#64748b;font-size:13px;">La factura se emite a continuación y te llegará por este mismo medio.</p>`
    }
    <p style="margin:0;color:#94a3b8;font-size:12px;">El comprobante de pago es un documento interno y no reemplaza a la factura.</p>
  `);
}

export interface InvoiceEmailData {
  studentName: string;
  period: string | null;
  amount: string;
  invoiceNumber: string;
  invoiceUrl: string;
  receiptUrl: string;
}

/** Aviso de factura emitida (se manda aparte cuando ARCA responde después del comprobante). */
export function invoiceEmail(d: InvoiceEmailData): string {
  const firstName = d.studentName.split(" ")[0];
  return emailLayout(`
    <p style="margin:0 0 16px;color:#1e293b;font-size:15px;">Hola <strong>${esc(firstName)}</strong>,</p>
    <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
      Emitimos la <strong>Factura C ${esc(d.invoiceNumber)}</strong> correspondiente a tu cuota de ${esc(periodLabel(d.period))}
      por ${esc(formatCents(toCents(d.amount)))}.
    </p>
    <p style="margin:0 0 12px;"><a href="${esc(d.invoiceUrl)}" style="display:inline-block;background:#2d5383;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 20px;border-radius:8px;">Ver factura</a></p>
    <p style="margin:0;"><a href="${esc(d.receiptUrl)}" style="color:#2d5383;font-size:13px;">Ver comprobante de pago</a></p>
  `);
}
