import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft } from "lucide-react";
import { formatCents, toCents } from "@/lib/money";
import { formatDateAR } from "@/lib/format";
import type { ReceiptData } from "../services/documents.service";
import type { InvoiceSnapshot } from "../services/invoice.service";
import { periodLabel } from "../lib/period-label";
import { PrintButton } from "./PrintButton";

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="text-slate-900 text-right font-medium">{children}</span>
  </div>
);

/**
 * Factura C emitida por ARCA. Muestra los datos fiscales que quedaron guardados al emitirla (no los
 * de la configuración actual), el CAE y el código QR de verificación.
 */
export async function InvoiceDocument({ data, backHref }: { data: ReceiptData; backHref?: string }) {
  const invoice = data.invoice;
  const snapshot = invoice?.providerResponse as InvoiceSnapshot | null;
  if (!invoice || invoice.fiscalStatus !== "issued" || !snapshot) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
        La factura de este pago todavía no fue emitida.
      </div>
    );
  }

  const qr = await QRCode.toString(snapshot.qrUrl, { type: "svg", margin: 0, width: 120 });
  const homologation = snapshot.env !== "produccion";

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

      <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-8 sm:p-10 print:shadow-none print:border-none print:p-6">
        {homologation && (
          <p className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 text-center">
            Comprobante de PRUEBA (homologación): no tiene validez fiscal.
          </p>
        )}

        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-base font-bold text-slate-900">{snapshot.issuer.razonSocial}</p>
            <p className="text-xs text-slate-500 mt-1">{snapshot.issuer.domicilio}</p>
            <p className="text-xs text-slate-500">{snapshot.issuer.condicionIva}</p>
          </div>
          <div className="text-center border border-slate-300 px-4 py-1 rounded">
            <p className="text-3xl font-bold leading-none">C</p>
            <p className="text-[10px] text-slate-500">COD. 011</p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <p className="text-base font-bold text-slate-900">FACTURA</p>
            <p>N.º {invoice.documentNumber}</p>
            <p>Fecha de emisión: {formatDateAR(snapshot.date)}</p>
            <p>CUIT: {snapshot.issuer.cuit}</p>
            <p>Ingresos Brutos: {snapshot.issuer.ingresosBrutos}</p>
            <p>Inicio de actividades: {snapshot.issuer.inicioActividades}</p>
          </div>
        </div>

        <div className="py-5 space-y-2 border-b border-slate-200">
          <Row label="Apellido y nombre">{snapshot.receptor.name}</Row>
          <Row label="DNI">{snapshot.receptor.docNro}</Row>
          <Row label="Condición frente al IVA">{snapshot.receptor.condicionIva}</Row>
          <Row label="Condición de venta">Contado</Row>
        </div>

        <div className="py-5 border-b border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-1">Descripción</th>
                <th className="py-1 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 text-slate-800">
                  Cuota {periodLabel(data.period)}
                  {data.courseName ? ` — ${data.courseName}` : ""}
                </td>
                <td className="py-2 text-right tabular-nums">{formatCents(toCents(invoice.amount))}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-end justify-between gap-4 pt-5">
          <div className="flex items-center gap-4">
            <div className="w-[120px] h-[120px]" dangerouslySetInnerHTML={{ __html: qr }} />
            <div className="text-xs text-slate-600 space-y-0.5">
              <p>
                <span className="font-semibold">CAE N.º:</span> {invoice.cae}
              </p>
              <p>
                <span className="font-semibold">Vto. del CAE:</span> {formatDateAR(invoice.caeExpiration)}
              </p>
              <p className="text-[10px] text-slate-400 pt-1">Comprobante autorizado por ARCA</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Importe total</p>
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{formatCents(toCents(invoice.amount))}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
