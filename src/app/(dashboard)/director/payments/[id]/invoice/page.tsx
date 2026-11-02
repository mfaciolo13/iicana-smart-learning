import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { getReceiptData } from "@/modules/payments/services/documents.service";
import { InvoiceDocument } from "@/modules/payments/components/InvoiceDocument";

export default async function PaymentInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["director"]);
  const { id } = await params;
  const data = await getReceiptData(id);
  if (!data || data.status !== "paid") notFound();
  return <InvoiceDocument data={data} backHref={`/director/payments/${id}`} />;
}
