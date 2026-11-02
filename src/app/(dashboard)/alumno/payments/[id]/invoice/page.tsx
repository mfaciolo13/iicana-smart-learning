import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/helpers";
import { getCurrentStudentId } from "@/modules/payments/services/payments.service";
import { getReceiptData } from "@/modules/payments/services/documents.service";
import { InvoiceDocument } from "@/modules/payments/components/InvoiceDocument";

export default async function AlumnoInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["alumno"]);
  const { id } = await params;
  const studentId = await getCurrentStudentId();
  const data = await getReceiptData(id);
  // Solo facturas propias; cualquier otro id responde 404.
  if (!studentId || !data || data.studentId !== studentId || data.status !== "paid") notFound();
  return <InvoiceDocument data={data} backHref="/alumno/payments" />;
}
