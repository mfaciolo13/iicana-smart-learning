import { notFound } from "next/navigation";
import Link from "next/link";
import { getPaymentById } from "@/modules/payments/services/payments.service";
import { PrintButton } from "./PrintButton";

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
};

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payment = await getPaymentById(id);

  if (!payment || payment.status !== "paid") notFound();

  const paidAt = payment.paidAt
    ? new Date(payment.paidAt).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  const amount = parseFloat(payment.amount).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });

  return (
    <div>
      <div className="flex items-center gap-4 mb-6 print:hidden">
        <Link href={`/admin/payments/${id}`} className="text-sm text-slate-400 hover:text-slate-600">
          ← Volver
        </Link>
        <PrintButton />
      </div>

      <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm p-10 print:shadow-none print:border-none print:rounded-none print:p-8">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Instituto IICANA</p>
          <h1 className="text-2xl font-bold text-slate-900">Recibo de Pago</h1>
          {payment.receiptNumber && (
            <p className="text-sm font-mono text-slate-500 mt-1">N° {payment.receiptNumber}</p>
          )}
        </div>

        <div className="border-t border-b border-dashed border-slate-200 py-6 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Alumno</span>
            <span className="text-slate-900 font-semibold">{payment.studentName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">DNI</span>
            <span className="font-mono text-slate-700">{payment.studentDni}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Fecha de pago</span>
            <span className="text-slate-700">{paidAt}</span>
          </div>
          {payment.method && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">Método</span>
              <span className="text-slate-700">{METHOD_LABELS[payment.method] ?? payment.method}</span>
            </div>
          )}
          {payment.notes && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400 font-medium">Concepto</span>
              <span className="text-slate-700 text-right max-w-[60%]">{payment.notes}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-6">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Total abonado</span>
          <span className="text-3xl font-bold text-emerald-700">{amount}</span>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-300">
          Documento generado por IICANA Smart Learning
        </div>
      </div>
    </div>
  );
}
