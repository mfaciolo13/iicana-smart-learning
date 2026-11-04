import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatCents, toCents } from "@/lib/money";
import { formatDateAR } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { METHOD_LABELS } from "../lib/pricing";
import { formatDateTimeAR, periodLabel } from "../lib/emails";
import type { ReceiptData } from "../services/documents.service";
import { PrintButton } from "./PrintButton";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-slate-400 font-medium shrink-0">{label}</span>
    <span className="text-slate-800 text-right">{children}</span>
  </div>
);

const money = (v: string | null) => (v == null ? "—" : formatCents(toCents(v)));

/**
 * Comprobante de pago imprimible. Es un documento interno: no es una factura fiscal (la factura,
 * si ya se emitió, figura aparte con su CAE). Lo usan los tres portales y el enlace seguro de
 * los correos.
 */
export function ReceiptDocument({
  data,
  backHref,
  publicLinkBase,
}: {
  data: ReceiptData;
  /** Link "Volver"; se omite en el enlace público de los correos. */
  backHref?: string;
  /** Prefijo para enlazar la factura (`/comprobante`). */
  publicLinkBase?: string;
}) {
  const paid = data.status === "paid";
  const discount = data.discountAmount ? toCents(data.discountAmount) : 0;
  const surcharge = data.surchargeAmount ? toCents(data.surchargeAmount) : 0;
  const number = data.receipt?.documentNumber ?? data.manualReceiptNumber;
  const invoice = data.invoice;

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 print:hidden">
        {backHref && (
          <Link href={backHref} className="text-sm text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver
          </Link>
        )}
        <PrintButton />
      </div>

      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 print:shadow-none print:border-none print:rounded-none print:p-8">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Smart Learning</p>
          <h1 className="text-2xl font-bold text-slate-900">Comprobante de pago</h1>
          {number && <p className="text-sm font-mono text-slate-500 mt-1">N.º {number}</p>}
          <div className="mt-3">
            <Badge variant={paid ? "success" : data.status === "cancelled" ? "neutral" : "warning"}>
              {paid ? "Pagado" : data.status === "cancelled" ? "Anulado" : "Pendiente"}
            </Badge>
          </div>
        </div>

        <div className="border-t border-b border-dashed border-slate-200 py-6 space-y-3">
          <Row label="Alumno">{data.studentName}</Row>
          <Row label="DNI">
            <span className="font-mono">{data.studentDni}</span>
          </Row>
          {data.courseName && <Row label="Curso">{data.courseName}</Row>}
          <Row label="Período abonado">{periodLabel(data.period)}</Row>
          {data.paidAt && <Row label="Fecha de pago">{formatDateTimeAR(data.paidAt)}</Row>}
          {data.method && <Row label="Medio de pago">{METHOD_LABELS[data.method]}</Row>}
          <Row label="Precio de lista">{money(data.listPrice)}</Row>
          {discount > 0 && (
            <Row label={`Descuento${data.discountPercentage ? ` (${Number(data.discountPercentage)}%)` : ""}`}>− {formatCents(discount)}</Row>
          )}
          {surcharge > 0 && <Row label="Recargo">+ {formatCents(surcharge)}</Row>}
          {data.internalReference && (
            <Row label="Operación">
              <span className="font-mono text-xs">{data.internalReference}</span>
            </Row>
          )}
          {data.providerPaymentId && (
            <Row label="N.º en Mercado Pago">
              <span className="font-mono text-xs">{data.providerPaymentId}</span>
            </Row>
          )}
          {data.manualReceiptNumber && data.receipt && <Row label="Recibo manual">{data.manualReceiptNumber}</Row>}
          {data.notes && <Row label="Observaciones">{data.notes}</Row>}
        </div>

        <div className="flex justify-between items-center mt-6">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Importe abonado</span>
          <span className="text-3xl font-bold text-emerald-700 tabular-nums">{money(data.finalAmount)}</span>
        </div>

        {invoice && (
          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-700 mb-1">Factura C</p>
            {invoice.fiscalStatus === "issued" ? (
              <>
                <p className="text-slate-600">
                  N.º {invoice.documentNumber} · emitida el {invoice.issuedAt ? formatDateTimeAR(invoice.issuedAt) : "—"}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  CAE {invoice.cae} · vence {formatDateAR(invoice.caeExpiration)}
                </p>
                {publicLinkBase && (
                  <Link href={`${publicLinkBase}/${invoice.accessToken}`} className="inline-block mt-2 text-brand-700 hover:underline print:hidden">
                    Ver factura
                  </Link>
                )}
              </>
            ) : (
              <p className="text-slate-500">
                {invoice.fiscalStatus === "failed" ? "La emisión de la factura está pendiente de reintento." : "La factura se está emitiendo."}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400 leading-relaxed">
          Comprobante interno de pago. No reemplaza a la factura fiscal.
          <br />
          Documento generado por Smart Learning
        </div>
      </div>
    </div>
  );
}
