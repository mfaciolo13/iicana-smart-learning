import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getReceiptDataByToken } from "@/modules/payments/services/documents.service";
import { ReceiptDocument } from "@/modules/payments/components/ReceiptDocument";
import { InvoiceDocument } from "@/modules/payments/components/InvoiceDocument";

export const metadata: Metadata = { title: "Comprobante de pago", robots: { index: false, follow: false } };

/** Enlace seguro de los correos: el token opaco es la credencial, no hace falta iniciar sesión. */
export default async function PublicReceiptPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const found = await getReceiptDataByToken(token);
  if (!found) notFound();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      {found.kind === "invoice_c" ? (
        <InvoiceDocument data={found.data} />
      ) : (
        <ReceiptDocument data={found.data} publicLinkBase="/comprobante" />
      )}
    </main>
  );
}
