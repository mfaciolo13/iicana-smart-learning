import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { getReceiptData } from "@/modules/payments/services/documents.service";
import { ReceiptDocument } from "@/modules/payments/components/ReceiptDocument";

export default async function PaymentReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["administrativo"]);
  const { id } = await params;
  const data = await getReceiptData(id);
  if (!data || data.status !== "paid") notFound();
  return <ReceiptDocument data={data} backHref={`/administrativo/payments/${id}`} />;
}
